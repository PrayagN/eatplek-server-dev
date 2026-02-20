/**
 * @swagger
 * tags:
 *   name: Vendor Authentication
 *   description: OTP based login flow for vendors
 */

/**
 * @swagger
 * /api/vendor-auth/send-otp:
 *   post:
 *     summary: Send OTP to vendor phone number
 *     tags: [Vendor Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - dialCode
 *               - phone
 *             properties:
 *               dialCode:
 *                 type: string
 *                 example: "+91"
 *               phone:
 *                 type: string
 *                 example: "9061213930"
 *               deviceOs:
 *                 type: string
 *                 example: "android"
 *               deviceName:
 *                 type: string
 *                 example: "Pixel 6"
 *               firebaseToken:
 *                 type: string
 *                 example: "fcm-token-123"
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: OTP sent successfully
 *       400:
 *         $ref: '#/components/responses/Error'
 *       404:
 *         description: Vendor not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         $ref: '#/components/responses/Error'
 */

/**
 * @swagger
 * /api/vendor-auth/verify-otp:
 *   post:
 *     summary: Verify OTP and log in vendor
 *     tags: [Vendor Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - dialCode
 *               - phone
 *               - otp
 *             properties:
 *               dialCode:
 *                 type: string
 *                 example: "+91"
 *               phone:
 *                 type: string
 *                 example: "9061213930"
 *               otp:
 *                 type: string
 *                 example: "123456"
 *               deviceOs:
 *                 type: string
 *                 example: "android"
 *               deviceName:
 *                 type: string
 *                 example: "Pixel 6"
 *               firebaseToken:
 *                 type: string
 *                 example: "fcm-token-123"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Login successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "60d5ec49f1b2c72b8c1a2b3c"
 *                     ownerName:
 *                       type: string
 *                       example: "John Doe"
 *                     restaurantName:
 *                       type: string
 *                       example: "Delicious Bites"
 *                     phoneNumber:
 *                       type: string
 *                       example: "+919876543210"
 *                     dialCode:
 *                       type: string
 *                       example: "91"
 *                     phone:
 *                       type: string
 *                       example: "9876543210"
 *                     isVerified:
 *                       type: boolean
 *                       example: true
 *                     verificationStatus:
 *                       type: string
 *                       example: "Approved"
 *                 token:
 *                   type: string
 *                   example: "jwt-token"
 *       400:
 *         $ref: '#/components/responses/Error'
 *       404:
 *         description: Vendor not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         $ref: '#/components/responses/Error'
 */

/**
 * @swagger
 * /api/vendors:
 *   post:
 *     summary: Create a new vendor (Admin only)
 *     tags: [Vendor Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - ownerName
 *               - phoneNumber
 *               - email
 *               - restaurantName
 *               - serviceOffered
 *               - fssaiLicenseNumber
 *               - gstNumber
 *               - address
 *               - operatingHours
 *               - commissionRate
 *             properties:
 *               ownerName:
 *                 type: string
 *                 example: John Doe
 *               phoneNumber:
 *                 type: string
 *                 example: "+919876543210"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: vendor@restaurant.com
 *               restaurantName:
 *                 type: string
 *                 example: Delicious Bites
 *               serviceOffered:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [Dine in, Delivery, Takeaway, Pickup]
 *                 example: ["Dine in", "Delivery"]
 *               fssaiLicenseNumber:
 *                 type: string
 *                 example: FSSAI123456789
 *               gstNumber:
 *                 type: string
 *                 example: "27AAACC1234D1Z5"
 *               address:
 *                 type: object
 *                 properties:
 *                   fullAddress:
 *                     type: string
 *                   pincode:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   coordinates:
 *                     type: array
 *                     items:
 *                       type: number
 *                     example: [72.8777, 19.0760]
 *               operatingHours:
 *                 type: array
 *                 description: Operating hours for all 7 days of the week
 *                 items:
 *                   type: object
 *                   required:
 *                     - day
 *                   properties:
 *                     day:
 *                       type: string
 *                       enum: [Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday]
 *                       example: Monday
 *                       description: Day of the week
 *                     openTime:
 *                       type: string
 *                       example: "10:00 AM"
 *                       description: "Opening time (Format: HH:MM AM/PM or HH:MM)"
 *                       nullable: true
 *                     closeTime:
 *                       type: string
 *                       example: "11:00 PM"
 *                       description: "Closing time (Format: HH:MM AM/PM or HH:MM)"
 *                       nullable: true
 *                     isClosed:
 *                       type: boolean
 *                       example: false
 *                       description: Whether the restaurant is closed on this day
 *                       default: false
 *                 example:
 *                   - day: Monday
 *                     openTime: "10:00 AM"
 *                     closeTime: "11:00 PM"
 *                     isClosed: false
 *                   - day: Tuesday
 *                     openTime: "10:00 AM"
 *                     closeTime: "11:00 PM"
 *                     isClosed: false
 *                   - day: Sunday
 *                     openTime: null
 *                     closeTime: null
 *                     isClosed: true
 *               commissionRate:
 *                 type: number
 *                 example: 15.5
 *                 description: Commission rate percentage (0-100)
 *               gstPercentage:
 *                 type: number
 *                 example: 5
 *                 default: 0
 *                 description: GST percentage (0-100). Default is 0 if not provided.
 *               bankAccounts:
 *                 type: array
 *                 description: Bank account details for payment processing (optional)
 *                 items:
 *                   type: object
 *                   required:
 *                     - bankName
 *                     - accountHolderName
 *                     - accountNumber
 *                     - ifscCode
 *                   properties:
 *                     bankName:
 *                       type: string
 *                       example: State Bank of India
 *                     accountHolderName:
 *                       type: string
 *                       example: John Doe
 *                     accountNumber:
 *                       type: string
 *                       example: "123456789012"
 *                     ifscCode:
 *                       type: string
 *                       pattern: "^[A-Z]{4}0[A-Z0-9]{6}$"
 *                       example: "SBIN0001234"
 *                       description: IFSC code (e.g., SBIN0001234)
 *                     accountType:
 *                       type: string
 *                       enum: [Primary, Secondary]
 *                       example: Primary
 *                       default: Secondary
 *                       description: At least one account must be Primary if bank accounts are provided
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *                       default: true
 *                 example:
 *                   - bankName: State Bank of India
 *                     accountHolderName: John Doe
 *                     accountNumber: "123456789012"
 *                     ifscCode: "SBIN0001234"
 *                     accountType: Primary
 *                     isActive: true
 *               profileImage:
 *                 type: string
 *                 format: binary
 *                 description: Profile image file (or provide profileImage URL in JSON)
 *               restaurantImage:
 *                 type: string
 *                 format: binary
 *                 description: Restaurant image file (or provide restaurantImage URL in JSON)
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Vendor'
 *           examples:
 *             default:
 *               $ref: '#/components/examples/vendorExample'
 *     responses:
 *       201:
 *         description: Vendor created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Vendor created successfully
 *                 data:
 *                   $ref: '#/components/schemas/VendorResponse'
 *       400:
 *         $ref: '#/components/responses/Error'
 *       401:
 *         description: Unauthorized - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Vendor with email/phone/FSSAI/GST already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/vendors:
 *   get:
 *     summary: Get all vendors with filtering and pagination
 *     tags: [Vendor Management]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: isVerified
 *         schema:
 *           type: boolean
 *         description: Filter by verification status
 *       - in: query
 *         name: verificationStatus
 *         schema:
 *           type: string
 *           enum: [Pending, Under Review, Approved, Rejected]
 *         description: Filter by verification status
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter by city
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: Filter by state
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Google-like search across multiple fields - restaurant name, owner name, email, phone number, FSSAI license, GST number, address (full address, city, state, pincode). Case-insensitive partial matching supported.
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Vendors retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Vendors retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/VendorResponse'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationMeta'
 */

/**
 * @swagger
 * /api/vendors/{id}:
 *   get:
 *     summary: Get a single vendor by ID
 *     tags: [Vendor Management]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *     responses:
 *       200:
 *         description: Vendor retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Vendor retrieved successfully
 *                 data:
 *                   $ref: '#/components/schemas/VendorResponse'
 *       404:
 *         description: Vendor not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /api/vendors/{id}:
 *   put:
 *     summary: Update a vendor (Admin only)
 *     tags: [Vendor Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             description: Partial vendor data (all fields optional)
 *             properties:
 *               restaurantName:
 *                 type: string
 *               ownerName:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               commissionRate:
 *                 type: number
 *               gstPercentage:
 *                 type: number
 *                 description: GST percentage (0-100)
 *               isVerified:
 *                 type: boolean
 *               verificationStatus:
 *                 type: string
 *                 enum: [Pending, Under Review, Approved, Rejected]
 *               profileImage:
 *                 type: string
 *                 format: binary
 *                 description: Profile image file (or provide profileImage URL in JSON)
 *               restaurantImage:
 *                 type: string
 *                 format: binary
 *                 description: Restaurant image file (or provide restaurantImage URL in JSON)
 *               address:
 *                 type: object
 *                 properties:
 *                   fullAddress:
 *                     type: string
 *                   pincode:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   coordinates:
 *                     type: array
 *                     items:
 *                       type: number
 *               operatingHours:
 *                 type: array
 *                 description: Operating hours for all 7 days of the week (optional for update)
 *                 items:
 *                   type: object
 *                   properties:
 *                     day:
 *                       type: string
 *                       enum: [Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday]
 *                       example: Monday
 *                     openTime:
 *                       type: string
 *                       example: "10:00 AM"
 *                       nullable: true
 *                     closeTime:
 *                       type: string
 *                       example: "11:00 PM"
 *                       nullable: true
 *                     isClosed:
 *                       type: boolean
 *                       example: false
 *               bankAccounts:
 *                 type: array
 *                 description: Bank account details for payment processing (optional)
 *                 items:
 *                   type: object
 *                   required:
 *                     - bankName
 *                     - accountHolderName
 *                     - accountNumber
 *                     - ifscCode
 *                   properties:
 *                     bankName:
 *                       type: string
 *                       example: State Bank of India
 *                     accountHolderName:
 *                       type: string
 *                       example: John Doe
 *                     accountNumber:
 *                       type: string
 *                       example: "123456789012"
 *                     ifscCode:
 *                       type: string
 *                       pattern: "^[A-Z]{4}0[A-Z0-9]{6}$"
 *                       example: "SBIN0001234"
 *                       description: IFSC code (e.g., SBIN0001234)
 *                     accountType:
 *                       type: string
 *                       enum: [Primary, Secondary]
 *                       example: Primary
 *                       default: Secondary
 *                       description: At least one account must be Primary if bank accounts are provided
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *                       default: true
 *               serviceOffered:
 *                 type: array
 *                 description: Service types offered (optional for update)
 *                 items:
 *                   type: string
 *                   enum: [Dine in, Delivery, Takeaway, Pickup]
 *                 example: ["Dine in", "Delivery"]
 *               fssaiLicenseNumber:
 *                 type: string
 *                 description: FSSAI license number (optional for update)
 *                 example: FSSAI123456789
 *               gstNumber:
 *                 type: string
 *                 description: GST number (optional for update)
 *                 example: "27AAACC1234D1Z5"
 *         application/json:
 *           schema:
 *             type: object
 *             description: Partial vendor data (all fields optional)
 *             properties:
 *               restaurantName:
 *                 type: string
 *               commissionRate:
 *                 type: number
 *               gstPercentage:
 *                 type: number
 *                 description: GST percentage (0-100)
 *               isVerified:
 *                 type: boolean
 *               verificationStatus:
 *                 type: string
 *                 enum: [Pending, Under Review, Approved, Rejected]
 *               profileImage:
 *                 type: string
 *                 format: uri
 *                 description: Profile image URL
 *               restaurantImage:
 *                 type: string
 *                 format: uri
 *                 description: Restaurant image URL
 *               operatingHours:
 *                 type: array
 *                 description: Operating hours for all 7 days of the week
 *                 items:
 *                   type: object
 *                   properties:
 *                     day:
 *                       type: string
 *                       enum: [Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday]
 *                       example: Monday
 *                     openTime:
 *                       type: string
 *                       example: "10:00 AM"
 *                       nullable: true
 *                     closeTime:
 *                       type: string
 *                       example: "11:00 PM"
 *                       nullable: true
 *                     isClosed:
 *                       type: boolean
 *                       example: false
 *               bankAccounts:
 *                 type: array
 *                 description: Bank account details for payment processing (optional)
 *                 items:
 *                   $ref: '#/components/schemas/BankAccount'
 *               address:
 *                 $ref: '#/components/schemas/Address'
 *               serviceOffered:
 *                 type: array
 *                 description: Service types offered (optional)
 *                 items:
 *                   type: string
 *                   enum: [Dine in, Delivery, Takeaway, Pickup]
 *                 example: ["Dine in", "Delivery"]
 *               fssaiLicenseNumber:
 *                 type: string
 *                 description: FSSAI license number (optional)
 *                 example: FSSAI123456789
 *               gstNumber:
 *                 type: string
 *                 description: GST number (optional)
 *                 example: "27AAACC1234D1Z5"
 *               ownerName:
 *                 type: string
 *                 description: Owner name (optional)
 *                 example: John Doe
 *               phoneNumber:
 *                 type: string
 *                 description: Phone number (optional)
 *                 example: "+919876543210"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address (optional)
 *                 example: vendor@restaurant.com
 *     responses:
 *       200:
 *         description: Vendor updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Vendor updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/VendorResponse'
 *       400:
 *         $ref: '#/components/responses/Error'
 *       401:
 *         description: Unauthorized - Admin access required
 *       404:
 *         description: Vendor not found
 */

/**
 * @swagger
 * /api/vendors/{id}/operating-hours:
 *   patch:
 *     summary: Update vendor operating hours (Vendor/Admin)
 *     description: |
 *       Admins and super admins can update operating hours for any vendor by passing the vendor ID in the path.
 *       Vendors SHOULD normally use the `/api/vendors/me/operating-hours` endpoint, where the vendor ID is taken from the JWT token.
 *       If a vendor calls this `/{id}` endpoint, the ID in the URL is ignored and the vendor from the JWT token is used instead.
 *     tags: [Vendor Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - operatingHours
 *             properties:
 *               operatingHours:
 *                 type: array
 *                 description: Operating hour settings for all 7 days (exactly 7 entries required)
 *                 minItems: 7
 *                 maxItems: 7
 *                 items:
 *                   type: object
 *                   required:
 *                     - day
 *                   properties:
 *                     day:
 *                       type: string
 *                       enum: [Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday]
 *                     openTime:
 *                       type: string
 *                       nullable: true
 *                       example: "10:00 AM"
 *                     closeTime:
 *                       type: string
 *                       nullable: true
 *                       example: "11:00 PM"
 *                     isClosed:
 *                       type: boolean
 *                       description: Set true if the restaurant is closed on this day
 *                 example:
 *                   - day: Monday
 *                     openTime: "10:00 AM"
 *                     closeTime: "11:00 PM"
 *                     isClosed: false
 *                   - day: Sunday
 *                     openTime: null
 *                     closeTime: null
 *                     isClosed: true
 *     responses:
 *       200:
 *         description: Operating hours updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Operating hours updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     operatingHours:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/OperatingHour'
 *       400:
 *         description: Validation error (e.g., missing days, invalid times)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Only vendor owner/admins can update
 *       404:
 *         description: Vendor not found
 */

/**
 * @swagger
 * /api/vendors/me/operating-hours:
 *   patch:
 *     summary: Update own operating hours (Vendor only)
 *     description: Allows an authenticated vendor to update their own operating hours without providing an ID. The vendor is resolved from the JWT token.
 *     tags: [Vendor Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - operatingHours
 *             properties:
 *               operatingHours:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/OperatingHour'
 *     responses:
 *       200:
 *         description: Operating hours updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized - Vendor token required
 */

/**
 * @swagger
 * /api/vendors/{id}/bank-accounts:
 *   patch:
 *     summary: Update vendor bank accounts (Vendor/Admin)
 *     description: |
 *       Replace the vendor bank accounts list. At least one account must be marked Primary when accounts are provided.
 *       Admins and super admins must pass the vendor ID in the path.
 *       Vendors SHOULD use `/api/vendors/me/bank-accounts` instead; when a vendor calls this `/{id}` endpoint, the URL ID is ignored and the vendor ID from the JWT token is used.
 *     tags: [Vendor Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bankAccounts
 *             properties:
 *               bankAccounts:
 *                 type: array
 *                 description: List of bank accounts that will replace the existing ones
 *                 items:
 *                   $ref: '#/components/schemas/BankAccount'
 *                 example:
 *                   - bankName: State Bank of India
 *                     accountHolderName: John Doe
 *                     accountNumber: "123456789012"
 *                     ifscCode: "SBIN0001234"
 *                     accountType: Primary
 *                     isActive: true
 *                   - bankName: ICICI Bank
 *                     accountHolderName: John Doe
 *                     accountNumber: "789456123012"
 *                     ifscCode: "ICIC0000456"
 *                     accountType: Secondary
 *                     isActive: true
 *     responses:
 *       200:
 *         description: Bank accounts updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: Bank accounts updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     bankAccounts:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/BankAccount'
 *       400:
 *         description: Validation error (e.g., missing fields, no primary account)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Only vendor owner/admins can update
 *       404:
 *         description: Vendor not found
 */

/**
 * @swagger
 * /api/vendors/me/bank-accounts:
 *   patch:
 *     summary: Update own bank accounts (Vendor only)
 *     description: Allows an authenticated vendor to replace their bank accounts using the vendor ID from their JWT token.
 *     tags: [Vendor Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bankAccounts
 *             properties:
 *               bankAccounts:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/BankAccount'
 *     responses:
 *       200:
 *         description: Bank accounts updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized - Vendor token required
 */

/**
 * @swagger
 * /api/vendors/{id}/details:
 *   patch:
 *     summary: Update vendor restaurant details & address (Vendor/Admin)
 *     description: |
 *       Updates the restaurant name, services offered, and address fields.
 *       Admins and super admins update any vendor by passing the vendor ID in the path.
 *       Vendors SHOULD use `/api/vendors/me/details` instead; when a vendor calls this `/{id}` endpoint, the URL ID is ignored and the vendor ID from the JWT token is used.
 *     tags: [Vendor Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - restaurantName
 *               - serviceOffered
 *               - address
 *             properties:
 *               restaurantName:
 *                 type: string
 *                 example: "Delicious Bites"
 *               serviceOffered:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [Dine in, Delivery, Takeaway, Pickup, Car Dine in]
 *                 example: ["Dine in", "Delivery"]
 *               address:
 *                 $ref: '#/components/schemas/Address'
 *     responses:
 *       200:
 *         description: Vendor details updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: Vendor details updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     restaurantName:
 *                       type: string
 *                     serviceOffered:
 *                       type: array
 *                       items:
 *                         type: string
 *                     address:
 *                       $ref: '#/components/schemas/Address'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Only vendor owner/admins can update
 *       404:
 *         description: Vendor not found
 */

/**
 * @swagger
 * /api/vendors/me/details:
 *   patch:
 *     summary: Update own restaurant details & address (Vendor only)
 *     description: Allows an authenticated vendor to update their restaurant name, services offered, and address using the vendor ID from their JWT token.
 *     tags: [Vendor Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - restaurantName
 *               - serviceOffered
 *               - address
 *             properties:
 *               restaurantName:
 *                 type: string
 *               serviceOffered:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [Dine in, Delivery, Takeaway, Pickup, Car Dine in]
 *               address:
 *                 $ref: '#/components/schemas/Address'
 *     responses:
 *       200:
 *         description: Vendor details updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized - Vendor token required
 */

/**
 * @swagger
 * /api/vendors/{id}/block:
 *   patch:
 *     summary: Block or unblock a vendor (Admin only)
 *     tags: [Vendor Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *     responses:
 *       200:
 *         description: Vendor status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Vendor blocked successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     isActive:
 *                       type: boolean
 *       401:
 *         description: Unauthorized - Admin access required
 *       404:
 *         description: Vendor not found
 */

/**
 * @swagger
 * /api/vendors/{id}:
 *   delete:
 *     summary: Soft delete a vendor (Admin only)
 *     tags: [Vendor Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *     responses:
 *       200:
 *         description: Vendor deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Vendor deleted successfully
 *       401:
 *         description: Unauthorized - Admin access required
 *       404:
 *         description: Vendor not found
 */

/**
 * @swagger
 * /api/vendors/{id}/hard:
 *   delete:
 *     summary: Permanently delete a vendor (Super Admin only)
 *     description: 'WARNING: This permanently deletes the vendor from the database'
 *     tags: [Vendor Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *     responses:
 *       200:
 *         description: Vendor permanently deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Vendor permanently deleted
 *       401:
 *         description: Unauthorized - Super Admin access required
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Vendor not found
 */

/**
 * @swagger
 * /api/vendors/search:
 *   get:
 *     summary: Search vendors by name (for adding branches)
 *     tags: [Vendor Management]
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query for vendor/restaurant name
 *         example: "Pizza Hut"
 *     responses:
 *       200:
 *         description: Vendors retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Vendors retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "60d5ec49f1b2c72b8c1a2b3c"
 *                       restaurantName:
 *                         type: string
 *                         example: "Pizza Hut"
 *                       location:
 *                         type: string
 *                         example: "123 Main St, Mumbai, Maharashtra - 400001"
 *                       profileImage:
 *                         type: string
 *                         format: uri
 *                         example: "https://imagekit.io/vendor-profile.jpg"
 *       400:
 *         description: Search query is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         $ref: '#/components/responses/Error'
 */

/**
 * @swagger
 * /api/vendors/{id}/branches:
 *   get:
 *     summary: Get all branches of a vendor
 *     tags: [Vendor Management]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Parent vendor ID
 *     responses:
 *       200:
 *         description: Branches retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Branches retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     vendorId:
 *                       type: string
 *                       example: "60d5ec49f1b2c72b8c1a2b3c"
 *                     restaurantName:
 *                       type: string
 *                       example: "Pizza Hut Main Branch"
 *                     totalBranches:
 *                       type: number
 *                       example: 3
 *                     branches:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: "60d5ec49f1b2c72b8c1a2b3d"
 *                           restaurantName:
 *                             type: string
 *                             example: "Pizza Hut - Andheri Branch"
 *                           profileImage:
 *                             type: string
 *                             format: uri
 *                           address:
 *                             $ref: '#/components/schemas/Address'
 *                           averageRating:
 *                             type: number
 *                             example: 4.5
 *                           reviewCount:
 *                             type: number
 *                             example: 150
 *                           isActive:
 *                             type: boolean
 *                             example: true
 *       404:
 *         description: Vendor not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         $ref: '#/components/responses/Error'
 */

/**
 * @swagger
 * /api/vendors/branches:
 *   post:
 *     summary: Add a branch connection using query parameters - Creates bidirectional connection (Admin only)
 *     description: Creates a bidirectional branch connection between two vendors using query parameters. When connecting vendor1 with vendor2, both vendors automatically get each other added to their branches.
 *     tags: [Vendor Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: vendor1Id
 *         required: true
 *         schema:
 *           type: string
 *         description: First vendor ID
 *         example: "60d5ec49f1b2c72b8c1a2b3c"
 *       - in: query
 *         name: vendor2Id
 *         required: true
 *         schema:
 *           type: string
 *         description: Second vendor ID
 *         example: "60d5ec49f1b2c72b8c1a2b3d"
 *     responses:
 *       200:
 *         description: Branch connection created successfully (bidirectional)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Branch connection created successfully (bidirectional)
 *                 data:
 *                   type: object
 *                   properties:
 *                     vendor1:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "60d5ec49f1b2c72b8c1a2b3c"
 *                         name:
 *                           type: string
 *                           example: "Pizza Hut Main Branch"
 *                         totalBranches:
 *                           type: number
 *                           example: 3
 *                     vendor2:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "60d5ec49f1b2c72b8c1a2b3d"
 *                         name:
 *                           type: string
 *                           example: "Pizza Hut Andheri"
 *                         totalBranches:
 *                           type: number
 *                           example: 1
 *       400:
 *         description: Invalid request - Both vendor IDs required, invalid format, or cannot connect vendor to itself
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - Admin access required
 *       404:
 *         description: Vendor 1 or Vendor 2 not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Branch connection already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         $ref: '#/components/responses/Error'
 */

/**
 * @swagger
 * /api/vendors/branches:
 *   delete:
 *     summary: Remove a branch connection using query parameters - Removes bidirectional connection (Admin only)
 *     description: Removes the bidirectional branch connection between two vendors using query parameters. When disconnecting vendor1 from vendor2, both vendors are automatically removed from each other's branches.
 *     tags: [Vendor Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: vendor1Id
 *         required: true
 *         schema:
 *           type: string
 *         description: First vendor ID
 *         example: "60d5ec49f1b2c72b8c1a2b3c"
 *       - in: query
 *         name: vendor2Id
 *         required: true
 *         schema:
 *           type: string
 *         description: Second vendor ID
 *         example: "60d5ec49f1b2c72b8c1a2b3d"
 *     responses:
 *       200:
 *         description: Branch connection removed successfully (bidirectional)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Branch connection removed successfully (bidirectional)
 *                 data:
 *                   type: object
 *                   properties:
 *                     vendor1:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "60d5ec49f1b2c72b8c1a2b3c"
 *                         name:
 *                           type: string
 *                           example: "Pizza Hut Main Branch"
 *                         totalBranches:
 *                           type: number
 *                           example: 2
 *                     vendor2:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "60d5ec49f1b2c72b8c1a2b3d"
 *                         name:
 *                           type: string
 *                           example: "Pizza Hut Andheri"
 *                         totalBranches:
 *                           type: number
 *                           example: 0
 *       400:
 *         description: Invalid request - Both vendor IDs required or invalid format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - Admin access required
 *       404:
 *         description: Vendor 1 not found, Vendor 2 not found, or branch connection not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         $ref: '#/components/responses/Error'
 */

/**
 * @swagger
 * /api/vendors/{id}/foods:
 *   get:
 *     summary: Get vendor foods grouped by category for details page
 *     description: |
 *       Fetches all active foods for a vendor, grouped by category. Excludes prebook foods.
 *       Filters by service type if provided (dine-in, delivery, takeaway, car-dine-in).
 *       Calculates offer prices based on active day offers if applicable.
 *       Each food includes cartCount set to 0 by default.
 *       If authenticated, cartCount will show the actual quantity in the user's cart.
 *     tags: [User App]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *         example: "60d5ec49f1b2c72b8c1a2b3c"
 *       - in: query
 *         name: service
 *         schema:
 *           type: string
 *           enum: [dine-in, delivery, takeaway, car-dine-in]
 *         description: Filter foods by service type
 *         example: "dine-in"
 *     responses:
 *       200:
 *         description: Data fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Data fetched"
 *                 service:
 *                   type: string
 *                   example: "dine in"
 *                   description: Service type used for filtering (or "all" if not specified)
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       category:
 *                         type: string
 *                         example: "Category Name"
 *                         description: Food category name
 *                       foods:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             foodName:
 *                               type: string
 *                               example: "Food Name 1"
 *                               description: Name of the food item
 *                             foodId:
 *                               type: string
 *                               example: "123456"
 *                               description: Food item ID
 *                             foodImage:
 *                               type: string
 *                               format: uri
 *                               example: "https://example.com/food1.jpg"
 *                               description: Food item image URL
 *                             actualPrice:
 *                               type: number
 *                               example: 299.99
 *                               description: Original base price of the food item
 *                             discountPrice:
 *                               type: number
 *                               nullable: true
 *                               example: 249.99
 *                               description: Regular discount price if available (null if no discount)
 *                             specialOfferPrice:
 *                               type: number
 *                               nullable: true
 *                               example: 224.99
 *                               description: Price after applying active special day offer (null if no active special offer)
 *                             specialOffer:
 *                               type: object
 *                               nullable: true
 *                               description: Special day offer details (null if no active offer)
 *                               properties:
 *                                 discountType:
 *                                   type: string
 *                                   enum: [percentage, fixed]
 *                                   example: "percentage"
 *                                 discountValue:
 *                                   type: number
 *                                   example: 10
 *                                 startTime:
 *                                   type: string
 *                                   example: "11:00 AM"
 *                                 endTime:
 *                                   type: string
 *                                   example: "11:00 PM"
 *                                 activeDays:
 *                                   type: array
 *                                   items:
 *                                     type: string
 *                                   example: ["Monday", "Tuesday", "Wednesday", "Thursday"]
 *                             foodPrice:
 *                               type: number
 *                               example: 224.99
 *                               description: Final price (specialOfferPrice if available, otherwise discountPrice, otherwise actualPrice)
 *                             cartCount:
 *                               type: integer
 *                               example: 0
 *                               description: Cart count (default 0, not integrated yet)
 *                   example:
 *                     - category: "Pizza"
 *                       foods:
 *                         - foodName: "Margherita Pizza"
 *                           foodId: "60d5ec49f1b2c72b8c1a2b3c"
 *                           foodImage: "https://example.com/pizza.jpg"
 *                           actualPrice: 299.99
 *                           discountPrice: 249.99
 *                           specialOfferPrice: 224.99
 *                           specialOffer:
 *                             discountType: "percentage"
 *                             discountValue: 10
 *                             startTime: "11:00 AM"
 *                             endTime: "11:00 PM"
 *                             activeDays: ["Monday", "Tuesday", "Wednesday", "Thursday"]
 *                           foodPrice: 224.99
 *                           cartCount: 0
 *                         - foodName: "Pepperoni Pizza"
 *                           foodId: "60d5ec49f1b2c72b8c1a2b3d"
 *                           foodImage: "https://example.com/pepperoni.jpg"
 *                           actualPrice: 349.99
 *                           discountPrice: null
 *                           specialOfferPrice: null
 *                           specialOffer: null
 *                           foodPrice: 349.99
 *                           cartCount: 0
 *                     - category: "Burgers"
 *                       foods:
 *                         - foodName: "Classic Burger"
 *                           foodId: "60d5ec49f1b2c72b8c1a2b3e"
 *                           foodImage: "https://example.com/burger.jpg"
 *                           actualPrice: 199.99
 *                           discountPrice: 179.99
 *                           specialOfferPrice: null
 *                           specialOffer: null
 *                           foodPrice: 179.99
 *                           cartCount: 0
 *       400:
 *         description: Bad request - Invalid service type or vendor ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid service type. Must be one of: dine-in, delivery, takeaway, car-dine-in"
 *       404:
 *         description: Vendor not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Vendor not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Error retrieving vendor foods"
 *                 error:
 *                   type: string
 *                   example: "Error message details"
 */

/**
 * @swagger
 * /api/vendors/{id}/check-delivery:
 *   get:
 *     summary: Check if user location is within vendor delivery radius
 *     description: Calculates the distance between user coordinates and vendor location, and checks if it's within the vendor's delivery radius
 *     tags: [Vendors]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *       - in: query
 *         name: latitude
 *         required: true
 *         schema:
 *           type: number
 *           format: float
 *         description: User's latitude (-90 to 90)
 *         example: 11.8745
 *       - in: query
 *         name: longitude
 *         required: true
 *         schema:
 *           type: number
 *           format: float
 *         description: User's longitude (-180 to 180)
 *         example: 75.3703
 *     responses:
 *       200:
 *         description: Delivery availability check successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     vendorId:
 *                       type: string
 *                       example: "6915a074f6ea81a62ea06a7d"
 *                     isAvailable:
 *                       type: boolean
 *                       example: true
 *                       description: Whether delivery is available at the user's location
 *                     distance:
 *                       type: number
 *                       format: float
 *                       example: 5.25
 *                       description: Distance in kilometers between user and vendor
 *                     deliveryRadius:
 *                       type: number
 *                       format: float
 *                       example: 10
 *                       description: Vendor's delivery radius in kilometers
 *                     message:
 *                       type: string
 *                       example: "Delivery is available. Distance: 5.25 km"
 *       400:
 *         description: Bad request - Missing or invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Latitude and longitude are required"
 *       404:
 *         description: Vendor not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Vendor not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Error checking delivery availability"
 */

/**
 * @swagger
 * /api/vendors/me/delivery-radius:
 *   patch:
 *     summary: Update vendor delivery radius (Vendor)
 *     description: Allows vendor to update their own delivery radius. The vendor ID is taken from the JWT token.
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               deliveryRadius:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 nullable: true
 *                 description: Delivery radius in kilometers. Set to null to remove delivery radius.
 *                 example: 10.5
 *     responses:
 *       200:
 *         description: Delivery radius updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Delivery radius updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     vendorId:
 *                       type: string
 *                       example: "6915a074f6ea81a62ea06a7d"
 *                     deliveryRadius:
 *                       type: number
 *                       format: float
 *                       nullable: true
 *                       example: 10.5
 *       400:
 *         description: Bad request - Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Validation failed"
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *       403:
 *         description: Forbidden - No permission to update this vendor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "You do not have permission to update this vendor"
 *       404:
 *         description: Vendor not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Vendor not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Error updating delivery radius"
 */

/**
 * @swagger
 * /api/vendors/{id}/delivery-radius:
 *   patch:
 *     summary: Update vendor delivery radius (Admin)
 *     description: Allows admin to update any vendor's delivery radius. Vendors SHOULD use `/api/vendors/me/delivery-radius` instead.
 *     tags: [Vendors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               deliveryRadius:
 *                 type: number
 *                 format: float
 *                 minimum: 0
 *                 nullable: true
 *                 description: Delivery radius in kilometers. Set to null to remove delivery radius.
 *                 example: 10.5
 *     responses:
 *       200:
 *         description: Delivery radius updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Delivery radius updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     vendorId:
 *                       type: string
 *                       example: "6915a074f6ea81a62ea06a7d"
 *                     deliveryRadius:
 *                       type: number
 *                       format: float
 *                       nullable: true
 *                       example: 10.5
 *       400:
 *         description: Bad request - Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Validation failed"
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *       403:
 *         description: Forbidden - No permission to update this vendor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "You do not have permission to update this vendor"
 *       404:
 *         description: Vendor not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Vendor not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Error updating delivery radius"
 */

