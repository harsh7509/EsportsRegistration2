# ArenaPulse Backend API Documentation

## Overview

ArenaPulse is a backend service for managing esports tournaments, scrims, organizations, promotions, user profiles, and related operations. It provides RESTful endpoints for players, organizations, and admins to interact with the platform, including registration, booking, team management, chat, payments, and more.

Authentication is handled via JWT tokens. Most endpoints require authentication, with role-based access control for sensitive operations.

---

## Table of Contents

- [Authentication & Profile](#authentication--profile)
- [Scrims](#scrims)
- [Tournaments](#tournaments)
- [Organizations](#organizations)
- [Promotions](#promotions)
- [Admin](#admin)
- [Uploads](#uploads)
- [Diagnostics](#diagnostics)

---

## Authentication & Profile

### Register

- **POST** `/api/auth/register`
- **Body:**  
  ```json
  {
    "name": "string",
    "email": "string",
    "password": "string",
    "role": "player | organization" // optional, default: "player"
  }
  ```
- **Response:**  
  - `201 Created`  
    ```json
    {
      "otpRequired": true,
      "tempToken": "string",
      "message": "Please check your email for the verification code"
    }
    ```
  - `400 Bad Request` (validation errors)
  - `409 Conflict` (email already in use)

### Login

- **POST** `/api/auth/login`
- **Body:**  
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```
- **Response:**  
  - `200 OK`  
    ```json
    {
      "user": { ... },
      "accessToken": "string",
      "refreshToken": "string"
    }
    ```
  - `400 Bad Request` (invalid credentials)

### Refresh Token

- **POST** `/api/auth/refresh`
- **Body:**  
  ```json
  { "refreshToken": "string" }
  ```
- **Response:**  
  - `200 OK`  
    ```json
    { "accessToken": "string" }
    ```
  - `401 Unauthorized` (invalid token)

### Get Profile

- **GET** `/api/auth/me`
- **Auth:** Required
- **Response:**  
  - `200 OK`  
    ```json
    { "user": { ... } }
    ```
  - `404 Not Found`

### Update Profile

- **PUT** `/api/auth/profile`
- **Auth:** Required
- **Body:**  
  ```json
  {
    "name": "string",
    "avatarUrl": "string",
    "organizationInfo": { ... }
  }
  ```
- **Response:**  
  - `200 OK`  
    ```json
    { "message": "Profile updated successfully", "user": { ... } }
    ```
  - `401 Unauthorized`

### Switch Role (Admin Only)

- **POST** `/api/auth/switch-role`
- **Auth:** Required (admin email only)
- **Body:**  
  ```json
  { "role": "admin | player | organization" }
  ```
- **Response:**  
  - `200 OK`
  - `403 Forbidden`

### OTP (Signup Verification)

- **POST** `/api/auth/otp/send`
- **Body:**  
  ```json
  { "tempToken": "string" }
  ```
- **POST** `/api/auth/otp/verify`
- **Body:**  
  ```json
  { "tempToken": "string", "code": "string" }
  ```
- **Response:**  
  - `200 OK` (tokens on success)
  - `400/401/429` (errors)

---

## Scrims

### List Scrims

- **GET** `/api/scrims`
- **Query:**  
  - `game` (string, optional)
  - `platform` (string, optional)
  - `date` (YYYY-MM-DD, optional)
  - `sort` (string, optional)
  - `page` (int, default: 1)
  - `limit` (int, default: 12)
  - `status` (string, optional)
  - `entryFee` (string, optional)
- **Response:**  
  - `200 OK`  
    ```json
    {
      "items": [ ... ],
      "total": 100,
      "page": 1,
      "totalPages": 9
    }
    ```

### Get Scrim Details

- **GET** `/api/scrims/:id`
- **Auth:** Required
- **Response:**  
  - `200 OK`  
    ```json
    {
      "scrim": { ... },
      "isBooked": true,
      "booking": { ... }
    }
    ```
  - `404 Not Found`

### Create Scrim

- **POST** `/api/scrims`
- **Auth:** Required (organization)
- **Body:**  
  ```json
  {
    "title": "string",
    "description": "string",
    "game": "string",
    "platform": "string",
    "date": "YYYY-MM-DD",
    "timeSlot": { "start": "ISO8601", "end": "ISO8601" },
    "capacity": 10,
    "entryFee": 100,
    "prizePool": 500,
    "room": { "id": "string", "password": "string" }
  }
  ```
- **Response:**  
  - `201 Created`  
    ```json
    { "scrim": { ... } }
    ```
  - `400 Bad Request`

### Book Scrim

- **POST** `/api/scrims/:id/book`
- **Auth:** Required (player)
- **Body:**  
  ```json
  { "playerInfo": { ... } }
  ```
- **Response:**  
  - `200 OK`  
    ```json
    {
      "booking": { ... },
      "message": "Successfully booked scrim",
      "requiresPayment": true
    }
    ```
  - `400 Bad Request`

### Get Room Credentials

- **GET** `/api/scrims/:id/room`
- **Auth:** Required
- **Response:**  
  - `200 OK`  
    ```json
    { "roomId": "string", "roomPassword": "string" }
    ```
  - `403 Forbidden`

### Update Scrim

- **PUT** `/api/scrims/:id`
- **Auth:** Required (organization)
- **Body:**  
  ```json
  { ...fields to update... }
  ```
- **Response:**  
  - `200 OK`  
    ```json
    { "scrim": { ... } }
    ```
  - `400/403/404`

### Delete Scrim

- **DELETE** `/api/scrims/:id`
- **Auth:** Required (organization)
- **Response:**  
  - `200 OK`  
    ```json
    { "message": "Scrim deleted successfully" }
    ```
  - `403/404`

### Remove Participant

- **DELETE** `/api/scrims/:id/participants/:playerId`
- **Auth:** Required (organization)
- **Response:**  
  - `200 OK`  
    ```json
    { "message": "Participant removed successfully" }
    ```
  - `403/404`

### Room Messages

- **GET** `/api/scrims/:id/room/messages`
- **Auth:** Required
- **Response:**  
  - `200 OK`  
    ```json
    { "room": { ... } }
    ```
- **POST** `/api/scrims/:id/room/messages`
- **Auth:** Required
- **Body:**  
  ```json
  {
    "content": "string",
    "type": "text | image | credentials | system",
    "imageUrl": "string" // if type is image
  }
  ```
- **Response:**  
  - `201 Created`  
    ```json
    { "message": { ... } }
    ```

### Payment

- **POST** `/api/scrims/:id/payment`
- **Auth:** Required (player)
- **Body:**  
  ```json
  {
    "paymentMethod": "string",
    "transactionId": "string"
  }
  ```
- **Response:**  
  - `200 OK`  
    ```json
    { "message": "Payment processed successfully" }
    ```

### Rate Scrim

- **POST** `/api/scrims/:id/rate`
- **Auth:** Required (player)
- **Body:**  
  ```json
  {
    "rating": 5,
    "comment": "string"
  }
  ```
- **Response:**  
  - `200 OK`  
    ```json
    { "message": "Rating submitted successfully" }
    ```

### Kick Requests

- **POST** `/api/scrims/:id/kick-requests`
- **Auth:** Required (player)
- **Body:**  
  ```json
  {
    "slotNumber": 1,
    "targetName": "string",
    "reason": "string"
  }
  ```
- **Response:**  
  - `201 Created`  
    ```json
    { ...kickRequest }
    ```
- **GET** `/api/scrims/:id/kick-requests`
- **Auth:** Required (organization/admin)
- **Query:** `status` (optional)
- **Response:**  
  - `200 OK`  
    ```json
    [ ...kickRequests ]
    ```
- **PATCH** `/api/scrims/:id/kick-requests/:reqId/resolve`
- **Auth:** Required (organization/admin)
- **Body:**  
  ```json
  { "action": "approve | reject", "orgNote": "string" }
  ```
- **Response:**  
  - `200 OK`  
    ```json
    { ...kickRequest }
    ```

---

## Tournaments

### List Tournaments

- **GET** `/api/tournaments`
- **Query:**  
  - `page`, `limit`, `organizationId`, `active`, `participantId`
- **Response:**  
  - `200 OK`  
    ```json
    {
      "items": [ ... ],
      "total": 100,
      "page": 1,
      "totalPages": 5
    }
    ```

### Get Tournament

- **GET** `/api/tournaments/:id`
- **Response:**  
  - `200 OK`  
    ```json
    { "tournament": { ... } }
    ```

### Create Tournament

- **POST** `/api/tournaments`
- **Auth:** Required (organization)
- **Body:**  
  ```json
  {
    "title": "string",
    "description": "string",
    "game": "string",
    "startAt": "ISO8601",
    "endAt": "ISO8601",
    "capacity": 100,
    "entryFee": 100,
    "prizePool": "string",
    "prizePoolTotal": 1000,
    "prizeBreakdown": [ ... ]
  }
  ```
- **Response:**  
  - `201 Created`  
    ```json
    { "tournament": { ... } }
    ```

### Update Tournament

- **PUT** `/api/tournaments/:id`
- **Auth:** Required (organization)
- **Body:**  
  ```json
  { ...fields to update... }
  ```
- **Response:**  
  - `200 OK`  
    ```json
    { "tournament": { ... } }
    ```

### Register Team

- **POST** `/api/tournaments/:id/register`
- **Auth:** Required (player)
- **Body:**  
  ```json
  {
    "teamName": "string",
    "phone": "string",
    "realName": "string",
    "players": [
      { "ignName": "string", "ignId": "string" }
    ],
    "ign": "string"
  }
  ```
- **Response:**  
  - `200 OK`  
    ```json
    { "tournament": { ... } }
    ```

### Get Participants

- **GET** `/api/tournaments/:id/participants`
- **Auth:** Required (org/admin)
- **Response:**  
  - `200 OK`  
    ```json
    { "participants": [ ... ] }
    ```

### Delete Tournament

- **DELETE** `/api/tournaments/:id`
- **Auth:** Required (org/admin)
- **Response:**  
  - `200 OK`  
    ```json
    { "ok": true }
    ```

### Group Management

- **POST** `/api/tournaments/:id/groups/auto`
- **Auth:** Required (org/admin)
- **Body:**  
  ```json
  { "size": 4 }
  ```
- **Response:**  
  - `200 OK`  
    ```json
    { "groups": [ ... ] }
    ```

- **POST** `/api/tournaments/:id/groups`
- **Auth:** Required (org/admin)
- **Body:**  
  ```json
  { "name": "string", "memberIds": [ ... ] }
  ```
- **Response:**  
  - `201 Created`  
    ```json
    { "group": { ... } }
    ```

- **GET** `/api/tournaments/:id/groups`
- **Auth:** Required (org/admin)
- **Response:**  
  - `200 OK`  
    ```json
    { "groups": [ ... ] }
    ```

- **POST** `/api/tournaments/:id/groups/:groupId/room`
- **Auth:** Required (org/admin)
- **Response:**  
  - `201 Created`  
    ```json
    { "roomId": "string" }
    ```

- **GET** `/api/tournaments/:id/groups/:groupId/room/messages`
- **Auth:** Required
- **Response:**  
  - `200 OK`  
    ```json
    { "room": { ... } }
    ```

---

## Organizations

### Get Rankings

- **GET** `/api/orgs/rankings`
- **Response:**  
  - `200 OK`  
    ```json
    { "items": [ ... ], "totalPages": 5 }
    ```

### Get Organization Details

- **GET** `/api/orgs/:orgId`
- **Response:**  
  - `200 OK`  
    ```json
    {
      "organization": { ... },
      "scrims": [ ... ],
      "averageRating": 4.5,
      "totalRatings": 20,
      "categoryAverages": { ... }
    }
    ```

### Submit Org KYC

- **POST** `/api/orgs/verify/submit`
- **Auth:** Required (organization)
- **Multipart Form:**  
  - `aadhaarImage` (file)
  - `selfieImage` (file)
  - `legalName`, `email`, `dob`, `aadhaarNumber`
- **Response:**  
  - `201 Created`  
    ```json
    { "message": "KYC submitted", "orgKyc": { ... } }
    ```

### Get Org KYC Status

- **GET** `/api/orgs/verify/me`
- **Auth:** Required (organization)
- **Response:**  
  - `200 OK`  
    ```json
    { "orgKyc": { ... }, "verified": true }
    ```

### Rate Organization

- **POST** `/api/orgs/:orgId/rate`
- **Auth:** Required (player)
- **Body:**  
  ```json
  {
    "rating": 5,
    "comment": "string",
    "categories": {
      "organization": 5,
      "communication": 5,
      "fairness": 5,
      "experience": 5
    },
    "scrimId": "string"
  }
  ```
- **Response:**  
  - `200 OK`  
    ```json
    { "message": "Rating saved", "rating": { ... } }
    ```

---

## Promotions

### List Active Promotions

- **GET** `/api/promos`
- **Response:**  
  - `200 OK`  
    ```json
    { "promotions": [ ... ] }
    ```

---

## Admin

> **All admin endpoints require authentication and `role: admin`.**

### Dashboard Stats

- **GET** `/api/admin/stats`
- **Response:**  
  - `200 OK`  
    ```json
    {
      "totalUsers": 1000,
      "totalOrgs": 50,
      "totalScrims": 200,
      "totalBookings": 500,
      "revenue": 10000,
      "activePromotions": 10,
      "totalRatings": 200
    }
    ```

### User Management

- **GET** `/api/admin/users`
- **PUT** `/api/admin/users/:userId/role`
- **DELETE** `/api/admin/users/:userId`
- **PUT** `/api/admin/users/:userId`

### Promotion Management

- **GET** `/api/admin/promotions`
- **POST** `/api/admin/promotions`
- **PUT** `/api/admin/promotions/:promoId`
- **DELETE** `/api/admin/promotions/:promoId`
- **POST** `/api/admin/promotions/:promoId/click`

### Scrim/Tournament/Booking/Payment/Rating Lists

- **GET** `/api/admin/scrims`
- **GET** `/api/admin/tournaments`
- **GET** `/api/admin/bookings`
- **GET** `/api/admin/payments`
- **GET** `/api/admin/ratings`

### Organization Controls

- **POST** `/api/admin/orgs/:userId/verify`
- **POST** `/api/admin/orgs/:userId/ranking`

### Scrim Admin

- **PATCH** `/api/admin/scrims/:scrimId`
- **GET** `/api/admin/scrims/:scrimId/participants`
- **POST** `/api/admin/scrims/:scrimId/participants`
- **DELETE** `/api/admin/scrims/:scrimId/participants/:playerId`
- **DELETE** `/api/admin/scrims/:scrimId`

### Org KYC Review

- **GET** `/api/admin/org-kyc`
- **POST** `/api/admin/org-kyc/:userId/review`

---

## Uploads

### Upload Image

- **POST** `/api/upload/image`
- **Auth:** Required
- **Multipart Form:**  
  - `image` (file)
- **Response:**  
  - `200 OK`  
    ```json
    { "imageUrl": "string", "publicId": "string" }
    ```

### Update Profile Avatar

- **POST** `/api/profile/avatar`
- **Auth:** Required
- **Multipart Form:**  
  - `image` (file)
- **Response:**  
  - `200 OK`  
    ```json
    { "avatarUrl": "string" }
    ```

---

## Diagnostics

### Test Email

- **GET** `/api/diagnostics/mail`
- **Response:**  
  - `200 OK`  
    ```json
    { "ok": true, "to": "string" }
    ```

---

## Common Response Formats

- **Success:**  
  ```json
  { ...data }
  ```
- **Error:**  
  ```json
  { "message": "Error description" }
  ```
  - May include additional fields for validation errors.

---

## Authentication

- Most endpoints require JWT authentication via `Authorization: Bearer <token>`.
- Role-based access:  
  - `player`, `organization`, `admin`
- Some endpoints are public (e.g., scrim/tournament listing, org rankings).

---

## Edge Cases & Notes

- **Date/Time:** All times are in Asia/Kolkata timezone unless specified.
- **Pagination:** All list endpoints support `page` and `limit` query params.
- **File Uploads:** Use multipart/form-data for image uploads.
- **Role Guards:** Sensitive actions (e.g., scrim/tournament creation, participant removal) require correct role.
- **Error Handling:** Always check for error responses and handle accordingly.
- **Booking/Payment:** Booking a paid scrim requires payment before credentials are revealed.

---

## Example Request

```http
POST /api/scrims
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Valorant Scrim",
  "game": "Valorant",
  "date": "2025-10-10",
  "timeSlot": { "start": "2025-10-10T18:00:00+05:30", "end": "2025-10-10T20:00:00+05:30" },
  "capacity": 10,
  "entryFee": 100
}
```

**Response:**
```json
{
  "scrim": {
    "_id": "abc123",
    "title": "Valorant Scrim",
    ...
  }
}
```

---

For further details, refer to each endpoint's section above. Always validate input and handle errors as per the documented status codes and response formats.
