import User from "../models/User.js";
import cloudinary from "../utils/cloudinary.js"; // agar aapka export `cloudinary.js` root me hai to path adjust karein
// NOTE: aapke repo me `cloudinary.js` hai — jahan se configured instance export hota ho, wahi import karo.

const uploadToCloud = (filePath, folder = "org-kyc") =>
  new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      filePath,
      { folder, resource_type: "image" },
      (err, result) => (err ? reject(err) : resolve(result))
    );
  });

export const submitOrgKyc = async (req, res) => {
  try {
    const me = await User.findById(req.user._id);
    if (!me || me.role !== "organization") {
      return res.status(403).json({ message: "Only organization owners can submit KYC" });
    }

    const { legalName, email, dob, aadhaarNumber } = req.body || {};
    if (!legalName || !email || !dob || !aadhaarNumber) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // files from multer fields
    const aadhaarFile = req.files?.aadhaarImage?.[0];
    const selfieFile = req.files?.selfieImage?.[0];
    if (!aadhaarFile || !selfieFile) {
      return res.status(400).json({ message: "Aadhaar image & Selfie with Aadhaar are required" });
    }

    const [aadhaarUpload, selfieUpload] = await Promise.all([
      uploadToCloud(aadhaarFile.path, "org-kyc"),
      uploadToCloud(selfieFile.path, "org-kyc"),
    ]);

    me.orgKyc = {
      status: "pending",
      legalName,
      email,
      dob: new Date(dob),
      aadhaarNumber, // UI me mask karo
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

export const myOrgKyc = async (req, res) => {
  try {
    const me = await User.findById(req.user._id).select("orgKyc organizationInfo").lean();
    if (!me) return res.status(404).json({ message: "User not found" });
    return res.json({ orgKyc: me.orgKyc, verified: !!me.organizationInfo?.verified });
  } catch (e) {
    console.error("myOrgKyc error:", e);
    return res.status(500).json({ message: "Failed to load KYC" });
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
