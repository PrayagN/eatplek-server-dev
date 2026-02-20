const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Eatplek API Documentation',
      version: '1.0.0',
      description: '## 📊 Total APIs: **66**\n\nComplete API documentation for Eatplek Vendor Management System with interactive testing capabilities.\n\n### API Breakdown:\n- **User Authentication**: 8 APIs\n- **Vendor Authentication**: 2 APIs\n- **Food Management**: 10 APIs\n- **Food Category Management**: 6 APIs\n- **Vendor Management**: 15 APIs\n- **Admin Authentication**: 3 APIs\n- **Media Upload**: 1 API\n- **Cart Management**: 6 APIs (includes connect/disconnect cart features)\n- **Booking Management**: 1 API\n- **Coupon Management**: 8 APIs\n- **Vendor Order Management**: 2 APIs\n- **Banner Management**: 5 APIs'
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://api-dev.eatplek.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token obtained from /api/admin/login. Click the Authorize button above to add your token.'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: 'Error message'
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string'
                  },
                  message: {
                    type: 'string'
                  }
                }
              }
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'Operation successful'
            }
          }
        },
        Admin: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '60d5ec49f1b2c72b8c1a2b3c'
            },
            name: {
              type: 'string',
              example: 'Admin User'
            },
            email: {
              type: 'string',
              example: 'admin@eatplek.com'
            },
            role: {
              type: 'string',
              enum: ['super_admin', 'admin', 'manager'],
              example: 'admin'
            },
            isActive: {
              type: 'boolean',
              example: true
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        OperatingHour: {
          type: 'object',
          properties: {
            day: {
              type: 'string',
              enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
              example: 'Monday'
            },
            openTime: {
              type: 'string',
              example: '10:00 AM'
            },
            closeTime: {
              type: 'string',
              example: '11:00 PM'
            },
            isClosed: {
              type: 'boolean',
              example: false
            }
          }
        },
        Address: {
          type: 'object',
          required: ['fullAddress', 'pincode', 'city', 'state', 'coordinates'],
          properties: {
            fullAddress: {
              type: 'string',
              example: '123 Main Street, Block A'
            },
            pincode: {
              type: 'string',
              pattern: '^\\d{6}$',
              example: '400001'
            },
            city: {
              type: 'string',
              example: 'Mumbai'
            },
            state: {
              type: 'string',
              example: 'Maharashtra'
            },
            coordinates: {
              type: 'array',
              items: {
                type: 'number'
              },
              minItems: 2,
              maxItems: 2,
              example: [72.8777, 19.0760],
              description: '[longitude, latitude]'
            }
          }
        },
        BankAccount: {
          type: 'object',
          properties: {
            bankName: {
              type: 'string',
              example: 'State Bank of India'
            },
            accountHolderName: {
              type: 'string',
              example: 'John Doe'
            },
            accountNumber: {
              type: 'string',
              example: '123456789012'
            },
            ifscCode: {
              type: 'string',
              pattern: '^[A-Z]{4}0[A-Z0-9]{6}$',
              example: 'SBIN0001234'
            },
            accountType: {
              type: 'string',
              enum: ['Primary', 'Secondary'],
              example: 'Primary'
            },
            isActive: {
              type: 'boolean',
              example: true
            }
          }
        },
        Vendor: {
          type: 'object',
          required: [
            'ownerName', 'phoneNumber', 'email', 'restaurantName',
            'serviceOffered', 'fssaiLicenseNumber', 'gstNumber',
            'address', 'operatingHours', 'commissionRate'
          ],
          properties: {
            ownerName: {
              type: 'string',
              example: 'John Doe'
            },
            phoneNumber: {
              type: 'string',
              example: '+919876543210'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'vendor@restaurant.com'
            },
            restaurantName: {
              type: 'string',
              example: 'Delicious Bites'
            },
            serviceOffered: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['Dine in', 'Delivery', 'Takeaway', 'Pickup']
              },
              example: ['Dine in', 'Delivery', 'Takeaway']
            },
            fssaiLicenseNumber: {
              type: 'string',
              example: 'FSSAI123456789'
            },
            gstNumber: {
              type: 'string',
              pattern: '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$',
              example: '27AAACC1234D1Z5'
            },
            address: {
              $ref: '#/components/schemas/Address'
            },
            operatingHours: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/OperatingHour'
              },
              minItems: 7,
              maxItems: 7
            },
            bankAccounts: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/BankAccount'
              }
            },
            commissionRate: {
              type: 'number',
              minimum: 0,
              maximum: 100,
              example: 15.5
            },
            profileImage: {
              type: 'string',
              format: 'uri',
              example: 'https://example.com/profile.jpg'
            },
            restaurantImage: {
              type: 'string',
              format: 'uri',
              example: 'https://example.com/restaurant.jpg'
            }
          }
        },
        VendorResponse: {
          type: 'object',
          allOf: [
            {
              $ref: '#/components/schemas/Vendor'
            },
            {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  example: '60d5ec49f1b2c72b8c1a2b3c'
                },
                isActive: {
                  type: 'boolean',
                  example: true
                },
                isVerified: {
                  type: 'boolean',
                  example: false
                },
                verificationStatus: {
                  type: 'string',
                  enum: ['Pending', 'Under Review', 'Approved', 'Rejected'],
                  example: 'Pending'
                },
                createdAt: {
                  type: 'string',
                  format: 'date-time'
                },
                updatedAt: {
                  type: 'string',
                  format: 'date-time'
                }
              }
            }
          ]
        },
        PaginationMeta: {
          type: 'object',
          properties: {
            currentPage: {
              type: 'number',
              example: 1
            },
            totalPages: {
              type: 'number',
              example: 5
            },
            totalCount: {
              type: 'number',
              example: 50
            },
            limit: {
              type: 'number',
              example: 10
            },
            hasNextPage: {
              type: 'boolean',
              example: true
            },
            hasPrevPage: {
              type: 'boolean',
              example: false
            }
          }
        },
        FoodCategory: {
          type: 'object',
          required: ['categoryName', 'image'],
          properties: {
            categoryName: {
              type: 'string',
              minLength: 2,
              maxLength: 100,
              example: 'Italian Cuisine'
            },
            image: {
              type: 'string',
              format: 'uri',
              example: 'https://example.com/images/italian-cuisine.jpg'
            },
            description: {
              type: 'string',
              maxLength: 500,
              example: 'Traditional Italian dishes including pasta, pizza, and risotto'
            }
          }
        },
        FoodCategoryResponse: {
          type: 'object',
          allOf: [
            {
              $ref: '#/components/schemas/FoodCategory'
            },
            {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  example: '60d5ec49f1b2c72b8c1a2b3c'
                },
                isActive: {
                  type: 'boolean',
                  example: true
                },
                createdAt: {
                  type: 'string',
                  format: 'date-time'
                },
                updatedAt: {
                  type: 'string',
                  format: 'date-time'
                }
              }
            }
          ]
        },
        AddOn: {
          type: 'object',
          required: ['name', 'price'],
          properties: {
            name: {
              type: 'string',
              example: 'Extra Cheese'
            },
            price: {
              type: 'number',
              minimum: 0,
              example: 50
            },
            image: {
              type: 'string',
              format: 'uri',
              example: 'https://example.com/images/extra-cheese.jpg'
            },
            imageKitFileId: {
              type: 'string',
              example: 'file_id_123'
            }
          }
        },
        DayOffer: {
          type: 'object',
          required: ['discountType', 'discountValue', 'activeDays', 'startTime', 'endTime'],
          properties: {
            discountType: {
              type: 'string',
              enum: ['percentage', 'fixed'],
              example: 'percentage'
            },
            discountValue: {
              type: 'number',
              minimum: 0,
              example: 10
            },
            activeDays: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
              },
              example: ['Monday', 'Tuesday']
            },
            startTime: {
              type: 'string',
              example: '10:00 AM'
            },
            endTime: {
              type: 'string',
              example: '2:00 PM'
            },
            isActive: {
              type: 'boolean',
              example: true
            }
          }
        },
        Food: {
          type: 'object',
          required: ['foodName', 'category', 'type', 'foodImage', 'basePrice', 'orderTypes', 'vendor'],
          properties: {
            foodName: {
              type: 'string',
              minLength: 2,
              maxLength: 200,
              example: 'Margherita Pizza'
            },
            category: {
              type: 'string',
              example: '60d5ec49f1b2c72b8c1a2b3c',
              description: 'Food category ID'
            },
            type: {
              type: 'string',
              enum: ['veg', 'non-veg'],
              example: 'veg'
            },
            foodImage: {
              type: 'string',
              format: 'uri',
              example: 'https://example.com/images/margherita-pizza.jpg'
            },
            description: {
              type: 'string',
              maxLength: 1000,
              example: 'Classic Italian pizza with fresh mozzarella, tomato sauce, and basil'
            },
            basePrice: {
              type: 'number',
              minimum: 0,
              example: 299.99
            },
            discountPrice: {
              type: 'number',
              minimum: 0,
              example: 249.99,
              description: 'Must be less than base price'
            },
            preparationTime: {
              type: 'integer',
              minimum: 0,
              example: 25,
              description: 'Preparation time in minutes'
            },
            packingCharges: {
              type: 'number',
              minimum: 0,
              default: 0,
              example: 10.5,
              description: 'Packing charges for the food item (default: 0)'
            },
            orderTypes: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['Dine in', 'Delivery', 'Takeaway', 'Pickup', 'Car Dine in']
              },
              example: ['Dine in', 'Delivery', 'Takeaway']
            },
            vendor: {
              type: 'string',
              example: '60d5ec49f1b2c72b8c1a2b3c',
              description: 'Vendor ID'
            },
            addOns: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/AddOn'
              },
              example: [
                { name: 'Extra Cheese', price: 50 },
                { name: 'Extra Sauce', price: 20 }
              ]
            },
            dayOffers: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/DayOffer'
              }
            },
            isActive: {
              type: 'boolean',
              example: true
            },
            isPrebook: {
              type: 'boolean',
              example: false,
              description: 'Whether this is a prebook food item'
            },
            prebookStartDate: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z',
              description: 'Start date for prebook availability (required if isPrebook is true)'
            },
            prebookEndDate: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-31T23:59:59.999Z',
              description: 'End date for prebook availability (required if isPrebook is true)'
            }
          }
        },
        FoodResponse: {
          type: 'object',
          allOf: [
            {
              $ref: '#/components/schemas/Food'
            },
            {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  example: '60d5ec49f1b2c72b8c1a2b3c'
                },
                effectivePrice: {
                  type: 'number',
                  example: 249.99,
                  description: 'Effective price (discount price if available, else base price)'
                },
                discountPercentage: {
                  type: 'number',
                  example: 16.67,
                  description: 'Discount percentage calculated from base and discount price'
                },
                category: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    categoryName: { type: 'string' },
                    image: { type: 'string' }
                  }
                },
                vendor: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    restaurantName: { type: 'string' },
                    ownerName: { type: 'string' }
                  }
                },
                createdAt: {
                  type: 'string',
                  format: 'date-time'
                },
                updatedAt: {
                  type: 'string',
                  format: 'date-time'
                }
              }
            }
          ]
        }
      },
      examples: {
        vendorExample: {
          value: {
            ownerName: 'John Doe',
            phoneNumber: '+919876543210',
            email: 'vendor@restaurant.com',
            restaurantName: 'Delicious Bites',
            serviceOffered: ['Dine in', 'Delivery', 'Takeaway'],
            fssaiLicenseNumber: 'FSSAI123456789',
            gstNumber: '27AAACC1234D1Z5',
            address: {
              fullAddress: '123 Main Street, Block A',
              pincode: '400001',
              city: 'Mumbai',
              state: 'Maharashtra',
              coordinates: [72.8777, 19.0760]
            },
            operatingHours: [
              { day: 'Monday', openTime: '10:00 AM', closeTime: '11:00 PM', isClosed: false },
              { day: 'Tuesday', openTime: '10:00 AM', closeTime: '11:00 PM', isClosed: false },
              { day: 'Wednesday', openTime: '10:00 AM', closeTime: '11:00 PM', isClosed: false },
              { day: 'Thursday', openTime: '10:00 AM', closeTime: '11:00 PM', isClosed: false },
              { day: 'Friday', openTime: '10:00 AM', closeTime: '11:00 PM', isClosed: false },
              { day: 'Saturday', openTime: '10:00 AM', closeTime: '11:00 PM', isClosed: false },
              { day: 'Sunday', openTime: null, closeTime: null, isClosed: true }
            ],
            bankAccounts: [
              {
                bankName: 'State Bank of India',
                accountHolderName: 'John Doe',
                accountNumber: '123456789012',
                ifscCode: 'SBIN0001234',
                accountType: 'Primary',
                isActive: true
              }
            ],
            commissionRate: 15.5
          }
        },
        foodCategoryExample: {
          value: {
            categoryName: 'Italian Cuisine',
            image: 'https://example.com/images/italian-cuisine.jpg',
            description: 'Traditional Italian dishes including pasta, pizza, and risotto'
          }
        }
      },
      responses: {
        Error: {
          description: 'Error response',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Admin Authentication',
        description: 'Admin registration, login, and profile management'
      },
      {
        name: 'Vendor Management',
        description: 'Vendor CRUD operations - Only admins can create, update, block, and delete vendors'
      },
      {
        name: 'Food Category Management',
        description: 'Food Category CRUD operations - Only admins can create, update, and delete food categories'
      },
      {
        name: 'Food Management',
        description: 'Food CRUD operations with Google-like search, filtering, and pagination - Admins, Super Admins, and Vendors can create, update, and delete food items. Vendors can only manage their own food items.'
      },
      {
        name: 'Offer Food',
        description: 'Day offer management for food items - Add and remove day-based offers. Food search by vendor with simplified response (food name, picture, food ID).'
      },
      {
        name: 'User Authentication',
        description: 'OTP login and profile management for users'
      },
      {
        name: 'User App',
        description: 'User app endpoints for home screen, vendor details, and food browsing'
      },
      {
        name: 'Cart',
        description: 'Add/get/remove/clear items in the user cart with vendor/service restrictions'
      },
      {
        name: 'Booking',
        description: 'Create bookings from the cart with a vendor acceptance timer workflow'
      }
    ]
  },
  apis: [path.join(__dirname, '../documents/*.js')]
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);

module.exports = swaggerDocs;

