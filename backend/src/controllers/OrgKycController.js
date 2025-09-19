import User from "../models/User.js";
import cloudinary from "../utils/cloudinary.js"; // agar aapka export `cloudinary.js` root me hai to path adjust karein
// NOTE: aapke repo me `cloudinary.js` hai — jahan se configured instance export hota ho, wahi import karo.

const uploadBufferToCloudinary = (buffer, folder = "org-kyc") =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });



export const myOrgKyc = async (req, res) => {
  const me = await User.findById(req.user._id).select("orgKyc role");
  if (!me || !["organization", "org"].includes(me.role)) {
    return res.status(403).json({ message: "Only organization owners can view KYC" });
  }
  const verified = !!me?.orgKyc && me.orgKyc.status === "approved";
  res.json({ orgKyc: me.orgKyc || null, verified });
};

export const submitOrgKyc = async (req, res) => {
  try {
    const me = await User.findById(req.user._id);
    if (!me || !["organization", "org"].includes(me.role)) {
      return res.status(403).json({ message: "Only organization owners can submit KYC" });
    }

    const { legalName, email, dob, aadhaarNumber } = req.body || {};
    if (!legalName || !email || !dob || !aadhaarNumber) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (!/^\d{12}$/.test(String(aadhaarNumber))) {
      return res.status(400).json({ message: "Aadhaar must be 12 digits" });
    }
    // date must be in past
    if (new Date(dob) > new Date()) {
      return res.status(400).json({ message: "DOB must be in the past" });
    }

    const aadhaarFile = req.files?.aadhaarImage?.[0];
    const selfieFile  = req.files?.selfieImage?.[0];
    if (!aadhaarFile || !selfieFile) {
      return res.status(400).json({ message: "Aadhaar image & Selfie with Aadhaar are required" });
    }

    // memoryStorage gives buffer (NOT path)
    if (!aadhaarFile.buffer || !selfieFile.buffer) {
      return res.status(400).json({ message: "Invalid file upload (no buffer)" });
    }

    // Optional: basic mime checks
    const ok = (f) => f.mimetype && f.mimetype.startsWith("image/");
    if (!ok(aadhaarFile) || !ok(selfieFile)) {
      return res.status(400).json({ message: "Only image files are allowed" });
    }

    const [aadhaarUpload, selfieUpload] = await Promise.all([
      uploadBufferToCloudinary(aadhaarFile.buffer, "org-kyc"),
      uploadBufferToCloudinary(selfieFile.buffer, "org-kyc"),
    ]);

    me.orgKyc = {
      status: "pending",
      legalName,
      email,
      dob: new Date(dob),
      aadhaarNumber,
      aadhaarImageUrl: aadhaarUpload.secure_url,
      selfieWithAadhaarUrl: selfieUpload.secure_url,
      notes: "",
      submittedAt: new Date(),
    };

    await me.save();
    return res.status(201).json({ message: "KYC submitted", orgKyc: me.orgKyc });
  } catch (e) {
    console.error("submitOrgKyc error:", e);
    return res.status(500).json({ message: "Failed to submit KYC" });
  }
};

// ---- Admin side ----
export const listOrgKyc = async (req, res) => {
  try {
    const admin = await User.findById(req.user._id);
    if (!admin || admin.role !== "admin") return res.status(403).json({ message: "Admin only" });

    const items = await User.find({
      role: "organization",
      "orgKyc.status": { $in: ["pending", "rejected", "approved"] },
    })
      .select("name email organizationInfo orgKyc")
      .sort({ "orgKyc.submittedAt": -1 })
      .lean();

    return res.json({ items });
  } catch (e) {
    console.error("listOrgKyc error:", e);
    return res.status(500).json({ message: "Failed to list KYC" });
  }
};

export const reviewOrgKyc = async (req, res) => {
  try {
    const admin = await User.findById(req.user._id);
    if (!admin || admin.role !== "admin") return res.status(403).json({ message: "Admin only" });

    const { userId } = req.params;
    const { action, notes } = req.body || {};
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ message: "Invalid action" });
    }

    const u = await User.findById(userId);
    if (!u) return res.status(404).json({ message: "User not found" });
    if (!u.orgKyc || u.orgKyc.status === "unsubmitted") {
      return res.status(400).json({ message: "No KYC to review" });
    }

    if (action === "approve") {
      u.orgKyc.status = "approved";
      u.organizationInfo.verified = true;
    } else {
      u.orgKyc.status = "rejected";
      u.organizationInfo.verified = false;
    }

    u.orgKyc.notes = notes || "";
    u.orgKyc.reviewedAt = new Date();
    u.orgKyc.reviewedBy = admin._id;

    await u.save();
    return res.json({ message: `KYC ${action}d`, orgKyc: u.orgKyc, verified: u.organizationInfo.verified });
  } catch (e) {
    console.error("reviewOrgKyc error:", e);
    return res.status(500).json({ message: "Failed to review KYC" });
  }
};
