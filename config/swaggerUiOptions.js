/**
 * Custom Swagger UI configuration
 */

const swaggerUiOptions = {
	customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui section.models { display: none }
    .swagger-ui .model-box { display: none }
    .swagger-ui .model-container { display: none }
    .swagger-ui .scheme-container { display: block !important; }
    .swagger-ui .filter-container { 
      padding: 20px 0;
      margin-bottom: 20px;
    }
    .swagger-ui input.filter { 
      width: 100%;
      padding: 10px;
      font-size: 14px;
      border: 1px solid #ccc;
      border-radius: 4px;
    }
    .api-count-badge {
      position: fixed;
      top: 10px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 10px 20px;
      border-radius: 25px;
      font-weight: bold;
      font-size: 14px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .api-count-badge::before {
      content: "📊";
      font-size: 18px;
    }
    .swagger-ui .info {
      margin-bottom: 30px;
    }
    .swagger-ui .info .description {
      margin-top: 15px;
      padding: 15px;
      background: #f8f9fa;
      border-left: 4px solid #667eea;
      border-radius: 4px;
    }
  `,
	customJs: `
    window.onload = function() {
      // Count total APIs dynamically
      function countAPIs() {
        var apiCount = 0;
        var operationElements = document.querySelectorAll('.opblock');
        apiCount = operationElements.length;
        
        // If count is 0, try alternative selector
        if (apiCount === 0) {
          var pathItems = document.querySelectorAll('.opblock-tag-section');
          pathItems.forEach(function(section) {
            var operations = section.querySelectorAll('.opblock');
            apiCount += operations.length;
          });
        }
        
        return apiCount;
      }
      
      // Display API count badge
      function displayAPICount() {
        var count = countAPIs();
        if (count > 0) {
          var badge = document.createElement('div');
          badge.className = 'api-count-badge';
          badge.innerHTML = '<span>Total APIs: ' + count + '</span>';
          document.body.appendChild(badge);
        }
      }
      
      // Enhance search to work with route paths
      setTimeout(function() {
        var filterInput = document.querySelector('.swagger-ui .filter');
        if (filterInput) {
          filterInput.setAttribute('placeholder', 'Search by route path (e.g., /api/vendors, /api/food-categories, /api/admin)');
          filterInput.style.display = 'block';
          filterInput.style.marginBottom = '20px';
        }
        
        // Display API count
        displayAPICount();
        
        // Ensure filter works on route paths by searching in all visible text including paths
        var originalFilter = window.ui && window.ui.filters;
        if (originalFilter) {
          // The built-in filter already searches through paths
          console.log('Swagger filter enabled for route paths');
        }
      }, 500);
      
      // Re-count when UI updates
      if (window.ui) {
        var originalOnComplete = window.ui.onComplete;
        if (originalOnComplete) {
          window.ui.onComplete = function() {
            if (originalOnComplete) originalOnComplete.apply(this, arguments);
            setTimeout(displayAPICount, 100);
          };
        }
      }
    };
  `,
	customSiteTitle: 'Eatplek API Documentation',
	customfavIcon: '/favicon.ico',
	swaggerOptions: {
		filter: true,
		showRequestHeaders: true,
		showCommonExtensions: true,
		tryItOutEnabled: true
	}
};

module.exports = swaggerUiOptions;

