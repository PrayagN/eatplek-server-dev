/**
 * @swagger
 * tags:
 *   name: User Authentication
 *   description: OTP login and profile management for users
 */

/**
 * @swagger
 * /api/users/send-otp:
 *   post:
 *     summary: Send OTP to user phone number
 *     tags: [User Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [dialCode, phone]
 *             properties:
 *               dialCode:
 *                 type: string
 *                 example: "+91"
 *               phone:
 *                 type: string
 *                 example: "9061213930"
 *               firebaseToken:
 *                 type: string
 *                 example: "fcm_token_here"
 *                 description: Optional Firebase token for push notifications
 *               deviceOs:
 *                 type: string
 *                 example: "iOS"
 *                 description: Device operating system (required on every login)
 *               deviceName:
 *                 type: string
 *                 example: "iPhone 15 Pro"
 *                 description: Device name/model (required on every login)
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         $ref: '#/components/responses/Error'
 */

/**
 * @swagger
 * /api/users/verify-otp:
 *   post:
 *     summary: Verify OTP and login or create pending user
 *     tags: [User Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [dialCode, phone, otp]
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
 *                 example: "iOS"
 *               deviceName:
 *                 type: string
 *                 example: "iPhone 15 Pro"
 *               firebaseToken:
 *                 type: string
 *                 example: "fcm_token_here"
 *     responses:
 *       200:
 *         description: Existing user login. `status` returns `registered` when the profile is complete, otherwise `pending`. `missingFields` is included when additional profile data is required.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Login successful
 *               status: registered
 *               data:
 *                 id: "60d5ec49f1b2c72b8c1a2b3c"
 *                 name: "Akhil"
 *                 dialCode: "+91"
 *                 phone: "9061213930"
 *                 district: "Ernakulam"
 *                 state: "Kerala"
 *                 place: "Kochi"
 *                 profileImage: "https://cdn.example.com/u123.jpg"
 *                 profileComplete: true
 *               token: "jwt_token_here"
 *       201:
 *         description: New user created with pending details. `missingFields` lists the information required to complete the profile.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: OTP verified. Additional details required to complete profile
 *               status: pending
 *               missingFields:
 *                 - name
 *                 - location
 *                 - state
 *                 - district
 *               token: "jwt_token_here"
 *       400:
 *         $ref: '#/components/responses/Error'
 */

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Update user profile details using latitude/longitude (state and district auto-extracted)
 *     tags: [User Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Akhil"
 *                 description: User's name
 *               latitude:
 *                 type: number
 *                 format: float
 *                 example: 9.9312
 *                 description: Latitude coordinate (state and district will be auto-extracted via Google Maps API)
 *               longitude:
 *                 type: number
 *                 format: float
 *                 example: 76.2673
 *                 description: Longitude coordinate (state and district will be auto-extracted via Google Maps API)
 *               firebaseToken:
 *                 type: string
 *                 example: "fcm_token_here"
 *                 description: Firebase token for push notifications (max 2 active devices)
 *               deviceOs:
 *                 type: string
 *                 example: "iOS"
 *                 description: Device operating system
 *               deviceName:
 *                 type: string
 *                 example: "iPhone 15 Pro"
 *                 description: Device name/model
 *               profileImage:
 *                 type: string
 *                 format: uri
 *                 example: "https://cdn.example.com/u123.jpg"
 *                 description: Optional profile image URL
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [registered, pending]
 *                   example: registered
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     dialCode:
 *                       type: string
 *                     phone:
 *                       type: string
 *                     district:
 *                       type: string
 *                       description: Auto-extracted from latitude/longitude
 *                     state:
 *                       type: string
 *                       description: Auto-extracted from latitude/longitude
 *                     place:
 *                       type: string
 *                       description: Locality/place extracted from latitude/longitude
 *                     location:
 *                       type: object
 *                       properties:
 *                         latitude:
 *                           type: number
 *                         longitude:
 *                           type: number
 *                     profileComplete:
 *                       type: boolean
 *                     profileImage:
 *                       type: string
 *                       nullable: true
 *                       example: "https://cdn.example.com/u123.jpg"
 *                 missingFields:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: Present when the profile is still incomplete
 *       401:
 *         $ref: '#/components/responses/Error'
 */

/**
 * @swagger
 * /api/users/me/deactivate:
 *   patch:
 *     summary: Deactivate (soft delete) the authenticated user's account
 *     description: Marks the account as inactive without permanently deleting data. All Firebase device tokens are cleared. The user must re-verify OTP to access the app again.
 *     tags: [User Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Taking a short break."
 *                 description: Optional reason for deactivation
 *     responses:
 *       200:
 *         description: Account deactivated successfully
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
 *                   example: Account deactivated successfully
 *       400:
 *         $ref: '#/components/responses/Error'
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: User not found
 *
 * @swagger
 * /api/users/me/restore:
 *   patch:
 *     summary: Restore a previously deactivated user account
 *     description: Reactivates an account that was soft deleted. The user regains access immediately.
 *     tags: [User Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account restored successfully
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
 *                   example: Account restored successfully
 *       400:
 *         $ref: '#/components/responses/Error'
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: User not found
 *
 * @swagger
 * /api/users/me/hard:
 *   delete:
 *     summary: Permanently delete the authenticated user's account
 *     description: Removes the user record and associated OTP entries from the system. This action cannot be undone.
 *     tags: [User Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted permanently
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
 *                   example: Account deleted permanently
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: User not found
 *
 * @swagger
 * /api/users/app/home:
 *   get:
 *     summary: Get user app home screen data with service detection and vendor listing
 *     description: |
 *       Detects available services in user's area by checking vendors within default radius for each service type.
 *       Returns vendors based on selected service type with open/close status.
 *       
 *       **Default Radius Rules:**
 *       - Dine-In: 30 km
 *       - Delivery: 10 km
 *       - Takeaway: 25 km
 *       - Car Dine-In: 40 km
 *       
 *       **Processing Flow:**
 *       1. Validates latitude and longitude
 *       2. Determines radius based on requested service type
 *       3. Finds vendors within radius using Haversine formula
 *       4. Collects all services from those vendors → availableServices[]
 *       5. If user selects a specific service, filters vendors by that service
 *       6. Calculates isOpenNow using user dateTime and vendor's weekly schedule
 *     tags: [User App]
 *     parameters:
 *       - in: query
 *         name: latitude
 *         required: true
 *         schema:
 *           type: number
 *           format: float
 *           minimum: -90
 *           maximum: 90
 *         description: User's latitude coordinate
 *         example: 9.9312
 *       - in: query
 *         name: longitude
 *         required: true
 *         schema:
 *           type: number
 *           format: float
 *           minimum: -180
 *           maximum: 180
 *         description: User's longitude coordinate
 *         example: 76.2673
 *       - in: query
 *         name: serviceType
 *         schema:
 *           type: string
 *           enum: [dine-in, delivery, takeaway, car-dine-in, all]
 *           default: all
 *         description: |
 *           Service type to filter vendors. 
 *           - "dine-in": Dine-in service (30 km default radius)
 *           - "delivery": Delivery service (10 km default radius)
 *           - "takeaway": Takeaway service (25 km default radius)
 *           - "car-dine-in": Car dine-in service (40 km default radius)
 *           - "all": Return available services only, no vendors
 *         example: "delivery"
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *           format: float
 *           minimum: 0.1
 *           maximum: 100
 *         description: Custom search radius in kilometers (overrides default radius for the selected service)
 *         example: 15
 *       - in: query
 *         name: dateTime
 *         schema:
 *           type: string
 *           format: date-time
 *         description: |
 *           Current date-time in ISO 8601 format (India timezone) to check vendor open/close status.
 *           If omitted or invalid, the server's current time is used automatically.
 *         example: "2025-11-19T10:30:00Z"
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *         description: Search keyword to filter vendors by name or location (food or hotel name)
 *         example: "pizza"
 *     responses:
 *       200:
 *         description: Home screen data retrieved successfully
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
 *                   example: "Home screen data retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     availableServices:
 *                       type: array
 *                       items:
 *                         type: string
 *                         enum: [dine-in, delivery, takeaway, car-dine-in]
 *                       description: List of services available in the user's area (within default radius for each service)
 *                       example: ["dine-in", "delivery", "takeaway"]
 *                     banners:
 *                       type: array
 *                       description: |
 *                         List of active, non-expired banners.
 *                         If banner has location, it's filtered by service-based radius.
 *                         Banners without location are global (shown to all users).
 *                       items:
 *                         type: object
 *                         properties:
 *                           bannerId:
 *                             type: string
 *                             description: Banner ID
 *                             example: "507f1f77bcf86cd799439050"
 *                           bannerImage:
 *                             type: string
 *                             description: Banner image URL
 *                             example: "https://ik.imagekit.io/eatplek/banners/banner1.jpg"
 *                           isPrebookRelated:
 *                             type: boolean
 *                             description: Whether banner is related to a prebook
 *                             example: true
 *                           hotel:
 *                             type: object
 *                             nullable: true
 *                             description: Hotel information if banner is hotel-specific
 *                             properties:
 *                               hotelId:
 *                                 type: string
 *                                 description: Hotel/Vendor ID
 *                               hotelName:
 *                                 type: string
 *                                 description: Hotel/Restaurant name
 *                               profileImage:
 *                                 type: string
 *                                 description: Hotel profile image
 *                               coverImage:
 *                                 type: string
 *                                 description: Hotel cover image
 *                               place:
 *                                 type: string
 *                                 description: Hotel city/location
 *                           prebook:
 *                             type: object
 *                             nullable: true
 *                             description: Prebook food information if banner is prebook-related
 *                             properties:
 *                               foodId:
 *                                 type: string
 *                                 description: Prebook food ID
 *                               foodName:
 *                                 type: string
 *                                 description: Prebook food name
 *                               foodImage:
 *                                 type: string
 *                                 description: Prebook food image
 *                               basePrice:
 *                                 type: number
 *                                 description: Original price
 *                               discountPrice:
 *                                 type: number
 *                                 nullable: true
 *                                 description: Discounted price
 *                               effectivePrice:
 *                                 type: number
 *                                 description: Final price (discounted or base)
 *                               prebookStartDate:
 *                                 type: string
 *                                 format: date-time
 *                                 description: Prebook start date
 *                               prebookEndDate:
 *                                 type: string
 *                                 format: date-time
 *                                 description: Prebook end date
 *                     vendors:
 *                       type: array
 *                       description: |
 *                         List of vendors offering the selected service type.
 *                         Empty array if serviceType is "all" or if no vendors match the criteria.
 *                       items:
 *                         type: object
 *                         properties:
 *                           hotelId:
 *                             type: string
 *                             description: Vendor/Hotel ID
 *                             example: "507f1f77bcf86cd799439011"
 *                           hotelName:
 *                             type: string
 *                             description: Restaurant/Hotel name
 *                             example: "ABC Restaurant"
 *                           profileImage:
 *                             type: string
 *                             description: Vendor profile image URL
 *                             example: "https://cdn.example.com/profile.jpg"
 *                           coverImage:
 *                             type: string
 *                             description: Restaurant cover/banner image URL
 *                             example: "https://cdn.example.com/cover.jpg"
 *                           place:
 *                             type: string
 *                             description: City/Location of the vendor
 *                             example: "Kochi"
 *                           isOpenNow:
 *                             type: boolean
 *                             description: |
 *                               Whether the vendor is currently open based on dateTime parameter and vendor's weekly schedule.
 *                               Calculated using: if (userDateTime >= openTime && userDateTime <= closeTime) then true else false
 *                             example: true
 *                           averageRating:
 *                             type: number
 *                             format: float
 *                             minimum: 0
 *                             maximum: 5
 *                             description: Average rating from reviews
 *                             example: 4.5
 *                           reviewCount:
 *                             type: integer
 *                             minimum: 0
 *                             description: Total number of reviews
 *                             example: 120
 *                           branchList:
 *                             type: array
 *                             description: List of branches that meet the same criteria (within radius, same service, active, verified)
 *                             items:
 *                               type: object
 *                               properties:
 *                                 hotelId:
 *                                   type: string
 *                                   description: Branch vendor ID
 *                                 hotelName:
 *                                   type: string
 *                                   description: Branch restaurant name
 *                                 profileImage:
 *                                   type: string
 *                                   description: Branch profile image URL
 *                                 coverImage:
 *                                   type: string
 *                                   description: Branch cover image URL
 *                                 place:
 *                                   type: string
 *                                   description: Branch city/location
 *                                 isOpenNow:
 *                                   type: boolean
 *                                   description: Branch open/close status
 *                                 averageRating:
 *                                   type: number
 *                                   format: float
 *                                   minimum: 0
 *                                   maximum: 5
 *                                   description: Branch average rating
 *                                   example: 4.2
 *                                 reviewCount:
 *                                   type: integer
 *                                   minimum: 0
 *                                   description: Branch total reviews
 *                                   example: 85
 *                     prebookList:
 *                       type: array
 *                       description: List of active prebook foods from all vendors (not expired)
 *                       items:
 *                         type: object
 *                         properties:
 *                           foodId:
 *                             type: string
 *                             description: Food item ID
 *                           foodName:
 *                             type: string
 *                             description: Food name
 *                             example: "Special Biryani"
 *                           foodImage:
 *                             type: string
 *                             description: Food image URL
 *                           description:
 *                             type: string
 *                             description: Food description
 *                             example: "Delicious special biryani with aromatic spices"
 *                           basePrice:
 *                             type: number
 *                             description: Original price
 *                             example: 250
 *                           discountPrice:
 *                             type: number
 *                             nullable: true
 *                             description: Discounted price
 *                             example: 200
 *                           effectivePrice:
 *                             type: number
 *                             description: Final price (discounted or base)
 *                             example: 200
 *                           prebookStartDate:
 *                             type: string
 *                             format: date-time
 *                             description: Prebook start date
 *                           prebookEndDate:
 *                             type: string
 *                             format: date-time
 *                             description: Prebook end date
 *                           category:
 *                             type: string
 *                             description: Food category name
 *                             example: "Main Course"
 *                           vendor:
 *                             type: object
 *                             description: Vendor information for this prebook
 *                             properties:
 *                               hotelId:
 *                                 type: string
 *                               hotelName:
 *                                 type: string
 *                               profileImage:
 *                                 type: string
 *                               coverImage:
 *                                 type: string
 *                               place:
 *                                 type: string
 *                               averageRating:
 *                                 type: number
 *                               reviewCount:
 *                                 type: integer
 *             examples:
 *               allServices:
 *                 summary: Get available services (serviceType=all)
 *                 value:
 *                   success: true
 *                   message: "Home screen data retrieved successfully"
 *                   data:
 *                     availableServices: ["dine-in", "delivery", "takeaway"]
 *                     banners: []
 *                     vendors: []
 *                     prebookList: []
 *               deliveryVendors:
 *                 summary: Get delivery vendors (serviceType=delivery)
 *                 value:
 *                   success: true
 *                   message: "Home screen data retrieved successfully"
 *                   data:
 *                     availableServices: ["dine-in", "delivery", "takeaway"]
 *                     banners:
 *                       - bannerId: "507f1f77bcf86cd799439050"
 *                         bannerImage: "https://ik.imagekit.io/eatplek/banners/banner1.jpg"
 *                         isPrebookRelated: true
 *                         hotel:
 *                           hotelId: "507f1f77bcf86cd799439011"
 *                           hotelName: "ABC Restaurant"
 *                           profileImage: "https://cdn.example.com/profile1.jpg"
 *                           coverImage: "https://cdn.example.com/cover1.jpg"
 *                           place: "Kochi"
 *                         prebook:
 *                           foodId: "507f1f77bcf86cd799439020"
 *                           foodName: "Special Biryani"
 *                           foodImage: "https://cdn.example.com/biryani.jpg"
 *                           basePrice: 250
 *                           discountPrice: 200
 *                           effectivePrice: 200
 *                           prebookStartDate: "2025-11-18T00:00:00Z"
 *                           prebookEndDate: "2025-11-25T23:59:59Z"
 *                     vendors:
 *                       - hotelId: "507f1f77bcf86cd799439011"
 *                         hotelName: "ABC Restaurant"
 *                         profileImage: "https://cdn.example.com/profile1.jpg"
 *                         coverImage: "https://cdn.example.com/cover1.jpg"
 *                         place: "Kochi"
 *                         isOpenNow: true
 *                         averageRating: 4.5
 *                         reviewCount: 120
 *                         branchList:
 *                           - hotelId: "507f1f77bcf86cd799439013"
 *                             hotelName: "ABC Restaurant - Branch 1"
 *                             profileImage: "https://cdn.example.com/profile3.jpg"
 *                             coverImage: "https://cdn.example.com/cover3.jpg"
 *                             place: "Ernakulam"
 *                             isOpenNow: true
 *                             averageRating: 4.2
 *                             reviewCount: 85
 *                       - hotelId: "507f1f77bcf86cd799439012"
 *                         hotelName: "XYZ Cafe"
 *                         profileImage: "https://cdn.example.com/profile2.jpg"
 *                         coverImage: "https://cdn.example.com/cover2.jpg"
 *                         place: "Ernakulam"
 *                         isOpenNow: false
 *                         averageRating: 3.8
 *                         reviewCount: 45
 *                         branchList: []
 *                     prebookList:
 *                       - foodId: "507f1f77bcf86cd799439020"
 *                         foodName: "Special Biryani"
 *                         foodImage: "https://cdn.example.com/biryani.jpg"
 *                         description: "Delicious special biryani with aromatic spices"
 *                         basePrice: 250
 *                         discountPrice: 200
 *                         effectivePrice: 200
 *                         prebookStartDate: "2025-11-18T00:00:00Z"
 *                         prebookEndDate: "2025-11-25T23:59:59Z"
 *                         category: "Main Course"
 *                         vendor:
 *                           hotelId: "507f1f77bcf86cd799439011"
 *                           hotelName: "ABC Restaurant"
 *                           profileImage: "https://cdn.example.com/profile1.jpg"
 *                           coverImage: "https://cdn.example.com/cover1.jpg"
 *                           place: "Kochi"
 *                           averageRating: 4.5
 *                           reviewCount: 120
 *       400:
 *         description: Validation error or missing required parameters
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
 *                   example: "latitude and longitude are required"
 *       500:
 *         $ref: '#/components/responses/Error'
 *
 * @swagger
 * /api/users/home:
 *   get:
 *     summary: Get user home data with vendors, ratings, offers, and location-based filtering
 *     description: |
 *       Fetches nearby vendors with delivery service, ratings, Wednesday offers, and open/close status.
 *       Works with or without authentication. Supports location-based filtering, search, and time-based filtering.
 *     tags: [User Authentication]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: serviceOffered
 *         schema:
 *           type: string
 *           enum: [Delivery]
 *         description: Filter vendors by service type (currently only Delivery is supported)
 *         example: "Delivery"
 *       - in: query
 *         name: userLatitude
 *         schema:
 *           type: number
 *           format: float
 *           minimum: -90
 *           maximum: 90
 *         description: User's latitude coordinate for location-based filtering
 *         example: 9.9312
 *       - in: query
 *         name: userLongitude
 *         schema:
 *           type: number
 *           format: float
 *           minimum: -180
 *           maximum: 180
 *         description: User's longitude coordinate for location-based filtering
 *         example: 76.2673
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *           format: float
 *           minimum: 0.1
 *           maximum: 100
 *           default: 10
 *         description: Search radius in kilometers (only used when latitude/longitude are provided)
 *         example: 10
 *       - in: query
 *         name: currentTime
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Current time in ISO 8601 format to check vendor open/close status and offer validity
 *         example: "2024-01-17T14:30:00.000Z"
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *         description: Google-like search across restaurant name, owner name, and address fields
 *         example: "pizza"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of vendors per page
 *         example: 20
 *     responses:
 *       200:
 *         description: Home data retrieved successfully
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
 *                   example: "Home data retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     vendors:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             description: Vendor ID
 *                           restaurantName:
 *                             type: string
 *                             example: "Pizza Palace"
 *                           ownerName:
 *                             type: string
 *                             example: "John Doe"
 *                           profileImage:
 *                             type: string
 *                             format: uri
 *                             description: Vendor profile image URL
 *                           restaurantImage:
 *                             type: string
 *                             format: uri
 *                             description: Restaurant image URL
 *                           address:
 *                             type: object
 *                             description: Vendor address with coordinates
 *                           serviceOffered:
 *                             type: array
 *                             items:
 *                               type: string
 *                             example: ["Delivery", "Dine in"]
 *                           averageRating:
 *                             type: number
 *                             format: float
 *                             minimum: 0
 *                             maximum: 5
 *                             example: 4.5
 *                             description: Average rating from reviews
 *                           reviewCount:
 *                             type: integer
 *                             example: 120
 *                             description: Total number of reviews
 *                           distance:
 *                             type: number
 *                             format: float
 *                             nullable: true
 *                             example: 2.5
 *                             description: Distance in kilometers (null if location not provided)
 *                           isOpen:
 *                             type: boolean
 *                             nullable: true
 *                             example: true
 *                             description: Whether vendor is currently open (null if currentTime not provided)
 *                           operatingHours:
 *                             type: object
 *                             nullable: true
 *                             description: Today's operating hours
 *                             properties:
 *                               day:
 *                                 type: string
 *                               openTime:
 *                                 type: string
 *                               closeTime:
 *                                 type: string
 *                               isClosed:
 *                                 type: boolean
 *                           todayOffers:
 *                             type: array
 *                             description: Foods with active offers for the current day
 *                             items:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: string
 *                                 foodName:
 *                                   type: string
 *                                 basePrice:
 *                                   type: number
 *                                 offerPrice:
 *                                   type: number
 *                                   description: Price after applying today's offer
 *                                 activeOffer:
 *                                   type: object
 *                                   properties:
 *                                     discountType:
 *                                       type: string
 *                                       enum: [percentage, fixed]
 *                                     discountValue:
 *                                       type: number
 *                                     startTime:
 *                                       type: string
 *                                     endTime:
 *                                       type: string
 *                           offerFoods:
 *                             type: array
 *                             description: Deprecated alias for todayOffers (kept for compatibility)
 *                           hasTodayOffers:
 *                             type: boolean
 *                             example: true
 *                             description: Whether vendor has offers available today
 *                           prebookFoods:
 *                             type: array
 *                             description: Active prebook foods for this vendor (within prebook date window)
 *                             items:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: string
 *                                 foodName:
 *                                   type: string
 *                                 basePrice:
 *                                   type: number
 *                                 discountPrice:
 *                                   type: number
 *                                   nullable: true
 *                                 effectivePrice:
 *                                   type: number
 *                                   description: Discounted price if available, else base price
 *                                 isPrebook:
 *                                   type: boolean
 *                                 prebookStartDate:
 *                                   type: string
 *                                   format: date-time
 *                                 prebookEndDate:
 *                                   type: string
 *                                   format: date-time
 *                     currentDay:
 *                       type: string
 *                       example: "Wednesday"
 *                       description: Current day of the week
 *                     currentTime:
 *                       type: string
 *                       format: date-time
 *                       description: Current time used for filtering
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         totalCount:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         hasNextPage:
 *                           type: boolean
 *                         hasPrevPage:
 *                           type: boolean
 *       400:
 *         $ref: '#/components/responses/Error'
 *       500:
 *         $ref: '#/components/responses/Error'
 */


