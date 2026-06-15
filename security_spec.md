# Security Specification (TDD SPEC) - RPLAI Request Management Portal

This security specification defines our security rules, data invariants, and "Dirty Dozen" malicious payloads to protect the RPLAI portal.

## 1. Identity & Data Invariants

1. **Self Profile Creation/Update Boundaries**: A user can register/create their initial profile (`users/{userId}`) if authenticated with `userId == request.auth.uid`. A standard user cannot change their own roles to "admin" or self-escalate their state to "active" from "pending" or "disabled".
2. **Access-to-Data Domain Restrictions**: Standard users who are pending approval or disabled are strictly forbidden from reading/writing requests or notifications.
3. **Request Isolation**: Standard users can only read or write requests that they created (`userId == request.auth.uid`) and that belong to their affiliate company (`entityId == userProfile.entityId`).
4. **Dynamic Client Management**: Only Admins can create, delete, or update client names in the `/entities` collection.
5. **System Notifications Isolation**: Standard users are blocked from reading notifications belonging to other users.

---

## 2. The "Dirty Dozen" Rogue Payloads

These 12 test payloads represent malicious or invalid actions that the Firestore rules engine must reject with `PERMISSION_DENIED`:

### Attack 01: Self-Signed Admin Role Setup
*   **Target**: `/users/ROGUE_USER_ID`
*   **Attack Vector**: Submitting a registration payload with `"role": "admin"`.
*   **Result**: `PERMISSION_DENIED` (role must be initialized as `'user'` on registry, except for white-listed emails).

### Attack 02: Unauthorized Account Activation
*   **Target**: `/users/ROGUE_USER_ID`
*   **Attack Vector**: Attempting to set own status from `"pending"` to `"active"` directly on updates.
*   **Result**: `PERMISSION_DENIED` (status change requires administrator permissions).

### Attack 03: Profile Peek (Cross-User Read)
*   **Target**: `/users/VICTIM_USER_ID`
*   **Attack Vector**: Reading a victim's registration profile.
*   **Result**: `PERMISSION_DENIED`.

### Attack 04: Rogue Request Creation (Hijacked Company)
*   **Target**: `/requests/REQ-2026-0001`
*   **Attack Vector**: Submitting a request with `entityId: "Happy Hen Hatchery, Inc."` when user belongs to `"Brasbag Development Corporation"`.
*   **Result**: `PERMISSION_DENIED`.

### Attack 05: Unapproved User Submitting Requests
*   **Target**: `/requests/REQ-2026-0001`
*   **Attack Vector**: A pending user attempting to submit form requests.
*   **Result**: `PERMISSION_DENIED`.

### Attack 06: Cross-Company Request Scraping (Scavenger Read)
*   **Target**: `/requests/REQ-2026-0001`
*   **Attack Vector**: Standard user trying to read or list requests belonging to other affiliate companies.
*   **Result**: `PERMISSION_DENIED`.

### Attack 07: Status Shortcutting / Instant completion
*   **Target**: `/requests/REQ-2026-0001`
*   **Attack Vector**: Standard user attempting to slide request status to `"Completed"` or `"Approved"` directly.
*   **Result**: `PERMISSION_DENIED`.

### Attack 08: Denial of Wallet / Oversized Request Type
*   **Target**: `/requests/REQ-OVERSIZED`
*   **Attack Vector**: Writing a `requestType` exceeding 100 characters.
*   **Result**: `PERMISSION_DENIED`.

### Attack 09: Impersonate System Alerts (Rogue Notification submission)
*   **Target**: `/notifications/NOTIF-ROGUE`
*   **Attack Vector**: A standard user creating a global notification or injecting other user's alert feeds.
*   **Result**: `PERMISSION_DENIED`.

### Attack 10: Anonymous Read Attempt
*   **Target**: `/entities/ent_01`
*   **Attack Vector**: Querying the `/entities` listing without logging in with Google.
*   **Result**: `PERMISSION_DENIED`.

### Attack 11: Spoofed Admin Token Setup
*   **Target**: `/users/ROGUE_USER_ID`
*   **Attack Vector**: Updating another user's profile to demote/promote roles directly.
*   **Result**: `PERMISSION_DENIED`.

### Attack 12: Entity Insertion (Rogue Client registration)
*   **Target**: `/entities/new_hack`
*   **Attack Vector**: Standard user attempting to register or edit a corporate affiliate in the entities listing.
*   **Result**: `PERMISSION_DENIED`.
