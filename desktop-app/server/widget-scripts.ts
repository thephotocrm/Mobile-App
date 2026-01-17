/**
 * Inlined widget embed scripts for production deployment
 * These scripts are served directly via res.send() instead of res.sendFile()
 * to avoid ENOENT errors when static files aren't bundled in Railway
 */

export const WIDGET_EMBED_SCRIPT = `/**
 * Photo CRM Widget Embed Script
 * Hosted widget that fetches configuration dynamically and renders forms
 */
(function() {
  'use strict';

  // Get script configuration from attributes
  function getScriptConfig() {
    // Get the API base URL from the current script's src
    var scriptSrc = document.currentScript ? document.currentScript.src : 
                    (document.querySelector('script[src*="/widget/embed.js"]') || {}).src;
    var apiBaseUrl = scriptSrc ? new URL(scriptSrc).origin : window.location.origin;
    
    // Find all widget containers and their tokens
    var containers = document.querySelectorAll('.photo-crm-widget[data-photographer-token]');
    if (containers.length === 0) {
      console.error('Photo CRM Widget: No containers found with class="photo-crm-widget" and data-photographer-token attribute');
      return null;
    }
    
    // Return configs for all containers found
    var configs = [];
    for (var i = 0; i < containers.length; i++) {
      var container = containers[i];
      var token = container.getAttribute('data-photographer-token');
      var config = container.getAttribute('data-config');
      
      if (token) {
        configs.push({
          token: token,
          config: config ? JSON.parse(config) : {},
          container: container,
          apiBaseUrl: apiBaseUrl
        });
      }
    }
    
    if (configs.length === 0) {
      console.error('Photo CRM Widget: data-photographer-token is required on container elements');
      return null;
    }
    
    return configs;
  }

  // HTML escape function to prevent XSS
  function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    var map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
  }

  // Color validation function to prevent CSS injection
  function validateColor(color) {
    if (!color) return null;
    // Allow hex colors (#fff, #ffffff) and named colors
    var hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    var rgbRegex = /^rgb\\s*\\(\\s*([0-9]{1,3})\\s*,\\s*([0-9]{1,3})\\s*,\\s*([0-9]{1,3})\\s*\\)$/;
    var rgbaRegex = /^rgba\\s*\\(\\s*([0-9]{1,3})\\s*,\\s*([0-9]{1,3})\\s*,\\s*([0-9]{1,3})\\s*,\\s*([0-1]?(?:\\.[0-9]+)?)\\s*\\)$/;
    var namedColors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'black', 'white', 'gray', 'grey'];
    
    if (hexRegex.test(color) || rgbRegex.test(color) || rgbaRegex.test(color) || namedColors.indexOf(color.toLowerCase()) >= 0) {
      return color;
    }
    return null;
  }

  // Fetch widget configuration from API
  function fetchWidgetConfig(token, apiBaseUrl, callback) {
    var apiUrl = apiBaseUrl + '/api/public/widget/' + token;
    
    var xhr = new XMLHttpRequest();
    xhr.open('GET', apiUrl, true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          try {
            var response = JSON.parse(xhr.responseText);
            if (response.success) {
              callback(null, response);
            } else {
              callback(new Error(response.message || 'Failed to load widget configuration'));
            }
          } catch (e) {
            callback(new Error('Invalid response from server'));
          }
        } else {
          callback(new Error('Failed to load widget configuration: ' + xhr.status));
        }
      }
    };
    xhr.send();
  }

  // Create and render widget
  function createWidget(widgetConfig, userConfig, token, specificContainer) {
    // Merge user config with default config
    var config = Object.assign({}, widgetConfig.config, userConfig);
    // apiEndpoint is already absolute from widgetConfig.apiEndpoint

    // Use the specific container passed to us
    var container = specificContainer;
    if (!container || container.getAttribute('data-photo-crm-initialized')) return;
    container.setAttribute('data-photo-crm-initialized', 'true');
      
      // Create widget container with validated colors
      var widget = document.createElement('div');
      widget.style.cssText = 'max-width: 400px; padding: 24px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
      widget.style.backgroundColor = validateColor(config.backgroundColor) || '#ffffff';
      widget.style.borderColor = validateColor(config.primaryColor) || '#3b82f6';
      widget.style.borderWidth = '1px';
      widget.style.borderStyle = 'solid';
      
      // Create header
      var header = document.createElement('div');
      header.style.cssText = 'text-align: center; margin-bottom: 24px;';
      
      var title = document.createElement('h3');
      title.style.cssText = 'font-size: 20px; font-weight: 600; margin-bottom: 8px;';
      title.style.color = validateColor(config.primaryColor) || '#3b82f6';
      title.textContent = config.title;
      
      var description = document.createElement('p');
      description.style.cssText = 'color: #666; margin: 0;';
      description.textContent = config.description;
      
      header.appendChild(title);
      header.appendChild(description);
      
      // Create form
      var form = document.createElement('form');
      form.style.cssText = 'display: flex; flex-direction: column; gap: 16px;';
      form.id = 'photo-crm-form-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      
      // Create form HTML with escaped content
      var formHtml = 
        '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">' +
          '<div>' +
            '<label style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 4px;">First Name *</label>' +
            '<input type="text" name="firstName" required style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;" />' +
          '</div>' +
          '<div>' +
            '<label style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 4px;">Last Name *</label>' +
            '<input type="text" name="lastName" required style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;" />' +
          '</div>' +
        '</div>' +
        '<div>' +
          '<label style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 4px;">Email *</label>' +
          '<input type="email" name="email" required style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;" />' +
        '</div>' +
        (config.showPhone ? '<div><label style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 4px;">Phone</label><input type="tel" name="phone" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;" /></div>' : '') +
        '<div>' +
          '<label style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 4px;">Project Type *</label>' +
          '<select name="projectType" required style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;">' +
            config.projectTypes.map(function(type) { return '<option value="' + escapeHtml(type) + '">' + escapeHtml(type.charAt(0) + type.slice(1).toLowerCase()) + '</option>'; }).join('') +
          '</select>' +
        '</div>' +
        (config.showEventDate ? '<div id="event-date-container"><label style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 4px;">Event Date</label><input type="date" name="eventDate" id="event-date-input" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;" /><div style="margin-top: 8px;"><label style="display: flex; align-items: center; cursor: pointer;"><input type="checkbox" id="no-date-checkbox" style="margin-right: 8px;" /><span style="font-size: 13px;">I don\\'t have a date yet</span></label></div></div>' : '') +
        (config.showMessage ? '<div><label style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 4px;">Message</label><textarea name="message" rows="3" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; resize: vertical;" placeholder="Tell us about your photography needs..."></textarea></div>' : '') +
        '<div style="background-color: #f8f9fa; padding: 16px; border-radius: 4px; margin: 16px 0; border: 1px solid #e9ecef;">' +
          '<div style="margin-bottom: 12px;">' +
            '<label style="display: flex; align-items: center; cursor: pointer;">' +
              '<input type="checkbox" name="communicationOptIn" checked style="margin-right: 8px;" />' +
              '<span style="font-size: 13px; color: #555;">' +
                'I agree to the privacy policy and agree to receive text, calls, or emails about my project' +
              '</span>' +
            '</label>' +
          '</div>' +
          '<p style="margin: 8px 0 0 0; font-size: 11px; color: #6c757d; line-height: 1.3;">' +
            'Your contact information will only be used for photography services and communications. ' +
            'We will never share your information with third parties. You can opt out at any time.' +
          '</p>' +
        '</div>' +
        '<button type="submit" style="width: 100%; padding: 12px; border: none; border-radius: 4px; color: white; font-size: 16px; font-weight: 600; cursor: pointer;">' + escapeHtml(config.buttonText) + '</button>';
      
      form.innerHTML = formHtml;
      
      // Apply validated colors to button after creation
      var submitButton = form.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.style.backgroundColor = validateColor(config.primaryColor) || '#3b82f6';
      }
      
      // Assemble widget
      widget.appendChild(header);
      widget.appendChild(form);
      container.appendChild(widget);
      
      // Add "I don't have a date yet" checkbox functionality
      var noDateCheckbox = form.querySelector('#no-date-checkbox');
      var eventDateInput = form.querySelector('#event-date-input');
      
      if (noDateCheckbox && eventDateInput) {
        noDateCheckbox.addEventListener('change', function() {
          if (this.checked) {
            eventDateInput.value = '';
            eventDateInput.disabled = true;
            eventDateInput.style.opacity = '0.5';
            eventDateInput.style.cursor = 'not-allowed';
          } else {
            eventDateInput.disabled = false;
            eventDateInput.style.opacity = '1';
            eventDateInput.style.cursor = 'text';
          }
        });
        
        eventDateInput.addEventListener('change', function() {
          if (this.value) {
            noDateCheckbox.checked = false;
            eventDateInput.disabled = false;
            eventDateInput.style.opacity = '1';
            eventDateInput.style.cursor = 'text';
          }
        });
      }
      
      // Add form submission handler
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        var formData = new FormData(form);
        var data = {
          firstName: formData.get('firstName'),
          lastName: formData.get('lastName'),
          email: formData.get('email'),
          phone: formData.get('phone') || '',
          message: formData.get('message') || '',
          projectType: formData.get('projectType'),
          eventDate: formData.get('eventDate') || '',
          emailOptIn: formData.get('communicationOptIn') === 'on',
          smsOptIn: formData.get('communicationOptIn') === 'on',
          redirectUrl: config.redirectUrl || ''
        };
        
        // Validate redirect URL on client side for additional security
        if (data.redirectUrl && !(data.redirectUrl.match(/^https?:\\/\\//) || data.redirectUrl.match(/^\\//))) {
          data.redirectUrl = '';
        }
        
        // Disable submit button during submission
        submitButton.disabled = true;
        submitButton.textContent = 'Submitting...';
        
        // Submit form - use absolute URL from config
        var xhr = new XMLHttpRequest();
        xhr.open('POST', widgetConfig.apiEndpoint, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onreadystatechange = function() {
          if (xhr.readyState === 4) {
            if (xhr.status === 201) {
              try {
                var response = JSON.parse(xhr.responseText);
                if (response.success) {
                  // Handle successful submission
                  if (data.redirectUrl) {
                    window.location.href = data.redirectUrl;
                  } else {
                    // Show success message
                    widget.innerHTML = '<div style="text-align: center; padding: 24px;"><h3 style="color: #059669; margin-bottom: 8px;">Success!</h3><p style="color: #666; margin: 0;">' + escapeHtml(config.successMessage) + '</p></div>';
                  }
                } else {
                  throw new Error(response.message || 'Submission failed');
                }
              } catch (e) {
                handleError('Invalid response from server');
              }
            } else {
              handleError('Failed to submit form. Please try again.');
            }
          }
        };
        xhr.send(JSON.stringify(data));
        
        function handleError(message) {
          // Re-enable submit button
          submitButton.disabled = false;
          submitButton.textContent = config.buttonText;
          
          // Show error message
          var errorDiv = form.querySelector('.error-message');
          if (errorDiv) {
            errorDiv.remove();
          }
          
          errorDiv = document.createElement('div');
          errorDiv.className = 'error-message';
          errorDiv.style.cssText = 'background-color: #fef2f2; border: 1px solid #fecaca; color: #dc2626; padding: 12px; border-radius: 4px; margin-top: 16px; font-size: 14px;';
          errorDiv.textContent = message;
          form.appendChild(errorDiv);
        }
      });
  }

  // Initialize widget
  function initWidget() {
    var scriptConfigs = getScriptConfig();
    if (!scriptConfigs || !scriptConfigs.length) return;
    
    // Process each widget container
    for (var i = 0; i < scriptConfigs.length; i++) {
      var config = scriptConfigs[i];
      
      // Skip if container already processed
      if (config.container.getAttribute('data-widget-processed') === 'true') {
        continue;
      }
      
      // Mark as processed to prevent duplicate initialization
      config.container.setAttribute('data-widget-processed', 'true');
      
      // Fetch configuration and create widget
      (function(containerConfig) {
        fetchWidgetConfig(containerConfig.token, containerConfig.apiBaseUrl, function(error, widgetConfig) {
          if (error) {
            console.error('Photo CRM Widget:', error.message);
            return;
          }
          
          createWidget(widgetConfig, containerConfig.config, containerConfig.token, containerConfig.container);
        });
      })(config);
    }
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }
})();`;

export const FORM_EMBED_SCRIPT = `/**
 * Lead Form Embed Script
 * Dynamically renders lead capture forms with custom fields
 */
(function() {
  'use strict';

  // HTML escape function to prevent XSS
  function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    var map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
  }

  // Color validation function
  function validateColor(color) {
    if (!color) return null;
    var hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexRegex.test(color) ? color : null;
  }

  // Get API base URL from script source
  function getApiBaseUrl() {
    var scriptSrc = document.currentScript ? document.currentScript.src : 
                    (document.querySelector('script[src*="/widget/form-embed.js"]') || {}).src;
    return scriptSrc ? new URL(scriptSrc).origin : window.location.origin;
  }

  // Fetch form configuration
  function fetchFormConfig(token, apiBaseUrl, callback) {
    var apiUrl = apiBaseUrl + '/api/public/lead-forms/' + token;
    
    var xhr = new XMLHttpRequest();
    xhr.open('GET', apiUrl, true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          try {
            var response = JSON.parse(xhr.responseText);
            callback(null, response);
          } catch (e) {
            callback(new Error('Invalid response from server'));
          }
        } else {
          callback(new Error('Failed to load form configuration: ' + xhr.status));
        }
      }
    };
    xhr.send();
  }

  // Group fields into rows based on width
  function groupFieldsIntoRows(fields) {
    var rows = [];
    var currentRow = [];

    fields.forEach(function(field) {
      var width = field.width || 'full';
      
      if (width === 'full') {
        if (currentRow.length > 0) {
          rows.push(currentRow);
          currentRow = [];
        }
        rows.push([field]);
      } else {
        currentRow.push(field);
        if (currentRow.length === 2) {
          rows.push(currentRow);
          currentRow = [];
        }
      }
    });

    if (currentRow.length > 0) {
      rows.push(currentRow);
    }

    return rows;
  }

  // Render a single form field with !important styles for CSS isolation
  function renderField(field) {
    var required = field.required ? ' *' : '';
    var requiredAttr = field.required ? ' required' : '';
    var fieldHtml = '';
    
    // Base styles with !important for isolation
    var labelStyle = 'display: block !important; font-size: 14px !important; font-weight: 500 !important; margin-bottom: 4px !important; color: #374151 !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;';
    var inputStyle = 'width: 100% !important; padding: 8px !important; border: 1px solid #d1d5db !important; border-radius: 4px !important; font-size: 14px !important; background: white !important; color: #1f2937 !important; box-sizing: border-box !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;';
    var selectStyle = inputStyle + ' appearance: auto !important; cursor: pointer !important;';
    var textareaStyle = inputStyle + ' resize: vertical !important; min-height: 80px !important;';

    switch (field.type) {
      case 'textarea':
        fieldHtml = '<div style="margin-bottom: 16px !important;">' +
          '<label style="' + labelStyle + '">' + escapeHtml(field.label) + required + '</label>' +
          '<textarea name="' + escapeHtml(field.id) + '"' + requiredAttr + ' rows="3" style="' + textareaStyle + '" placeholder="' + escapeHtml(field.placeholder || '') + '"></textarea>' +
        '</div>';
        break;
      
      case 'select':
        var options = (field.options || []).map(function(opt) {
          return '<option value="' + escapeHtml(opt) + '">' + escapeHtml(opt) + '</option>';
        }).join('');
        fieldHtml = '<div style="margin-bottom: 16px !important;">' +
          '<label style="' + labelStyle + '">' + escapeHtml(field.label) + required + '</label>' +
          '<select name="' + escapeHtml(field.id) + '"' + requiredAttr + ' style="' + selectStyle + '">' +
            '<option value="">Select an option</option>' + options +
          '</select>' +
        '</div>';
        break;
      
      case 'checkbox':
        var checkboxOptions = (field.options || []).map(function(opt, i) {
          return '<label style="display: flex !important; align-items: center !important; margin-bottom: 8px !important; cursor: pointer !important;">' +
            '<input type="checkbox" name="' + escapeHtml(field.id) + '" value="' + escapeHtml(opt) + '" style="margin-right: 8px !important; cursor: pointer !important; width: auto !important; height: auto !important;" />' +
            '<span style="font-size: 14px !important; color: #374151 !important; font-family: -apple-system, BlinkMacSystemFont, \\'Segoe UI\\', Roboto, sans-serif !important;">' + escapeHtml(opt) + '</span>' +
          '</label>';
        }).join('');
        fieldHtml = '<div style="margin-bottom: 16px !important;">' +
          '<label style="' + labelStyle + '">' + escapeHtml(field.label) + required + '</label>' +
          checkboxOptions +
        '</div>';
        break;
      
      default:
        var inputType = field.type === 'phone' ? 'tel' : field.type;
        fieldHtml = '<div style="margin-bottom: 16px !important;">' +
          '<label style="' + labelStyle + '">' + escapeHtml(field.label) + required + '</label>' +
          '<input type="' + inputType + '" name="' + escapeHtml(field.id) + '"' + requiredAttr + ' style="' + inputStyle + '" placeholder="' + escapeHtml(field.placeholder || '') + '" />' +
        '</div>';
    }

    return fieldHtml;
  }

  // Create privacy policy modal
  function createPrivacyPolicyModal(photographerName) {
    var modal = document.createElement('div');
    modal.id = 'photo-crm-privacy-modal';
    modal.style.cssText = 'display: none !important; position: fixed !important; z-index: 10000 !important; left: 0 !important; top: 0 !important; width: 100% !important; height: 100% !important; overflow: auto !important; background-color: rgba(0,0,0,0.5) !important;';
    
    var modalContent = document.createElement('div');
    modalContent.style.cssText = 'background-color: #fff !important; margin: 5% auto !important; padding: 30px !important; border-radius: 8px !important; width: 90% !important; max-width: 600px !important; max-height: 80vh !important; overflow-y: auto !important; box-shadow: 0 4px 6px rgba(0,0,0,0.1) !important; position: relative !important;';
    
    var closeBtn = document.createElement('span');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = 'position: absolute !important; top: 15px !important; right: 20px !important; color: #999 !important; font-size: 32px !important; font-weight: bold !important; cursor: pointer !important; line-height: 1 !important;';
    closeBtn.onclick = function() { modal.style.display = 'none'; };
    
    var title = document.createElement('h2');
    title.textContent = 'Privacy Policy';
    title.style.cssText = 'margin-top: 0 !important; margin-bottom: 20px !important; color: #1f2937 !important; font-size: 24px !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;';
    
    var content = document.createElement('div');
    content.style.cssText = 'color: #4b5563 !important; font-size: 14px !important; line-height: 1.6 !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;';
    content.innerHTML = '<p style="margin-bottom: 15px !important;"><strong>Last Updated:</strong> ' + new Date().toLocaleDateString() + '</p>' +
      '<h3 style="color: #1f2937 !important; font-size: 18px !important; margin-top: 20px !important; margin-bottom: 10px !important;">Information We Collect</h3>' +
      '<p style="margin-bottom: 15px !important;">When you submit this form, we collect the information you provide, including your name, email address, phone number, and any other details you share with us. This information is used solely to respond to your inquiry and provide you with photography services.</p>' +
      '<h3 style="color: #1f2937 !important; font-size: 18px !important; margin-top: 20px !important; margin-bottom: 10px !important;">How We Use Your Information</h3>' +
      '<p style="margin-bottom: 15px !important;">We use your information to:</p>' +
      '<ul style="margin-bottom: 15px !important; padding-left: 20px !important;">' +
        '<li style="margin-bottom: 8px !important;">Respond to your inquiry and communicate about photography services</li>' +
        '<li style="margin-bottom: 8px !important;">Send appointment reminders and project updates</li>' +
        '<li style="margin-bottom: 8px !important;">Process bookings and payments</li>' +
        '<li style="margin-bottom: 8px !important;">Improve our services and customer experience</li>' +
      '</ul>' +
      '<h3 style="color: #1f2937 !important; font-size: 18px !important; margin-top: 20px !important; margin-bottom: 10px !important;">SMS Communications</h3>' +
      '<p style="margin-bottom: 15px !important;">If you opt in to receive SMS messages, we will send you text messages related to your photography project. Message and data rates may apply. Message frequency varies based on your project needs. You can opt out at any time by replying STOP to any message. Reply HELP for assistance.</p>' +
      '<h3 style="color: #1f2937 !important; font-size: 18px !important; margin-top: 20px !important; margin-bottom: 10px !important;">Information Sharing</h3>' +
      '<p style="margin-bottom: 15px !important;">We do not sell, trade, or share your personal information with third parties for marketing purposes. We may share information with trusted service providers who assist us in operating our business, but they are obligated to keep your information confidential.</p>' +
      '<h3 style="color: #1f2937 !important; font-size: 18px !important; margin-top: 20px !important; margin-bottom: 10px !important;">Your Rights</h3>' +
      '<p style="margin-bottom: 15px !important;">You have the right to:</p>' +
      '<ul style="margin-bottom: 15px !important; padding-left: 20px !important;">' +
        '<li style="margin-bottom: 8px !important;">Access the personal information we hold about you</li>' +
        '<li style="margin-bottom: 8px !important;">Request correction of inaccurate information</li>' +
        '<li style="margin-bottom: 8px !important;">Request deletion of your information</li>' +
        '<li style="margin-bottom: 8px !important;">Opt out of marketing communications at any time</li>' +
      '</ul>' +
      '<h3 style="color: #1f2937 !important; font-size: 18px !important; margin-top: 20px !important; margin-bottom: 10px !important;">Contact Us</h3>' +
      '<p style="margin-bottom: 15px !important;">If you have questions about this privacy policy or how we handle your information, please contact ' + escapeHtml(photographerName) + ' directly through the contact information provided on our website.</p>';
    
    modalContent.appendChild(closeBtn);
    modalContent.appendChild(title);
    modalContent.appendChild(content);
    modal.appendChild(modalContent);
    
    // Close modal when clicking outside
    modal.onclick = function(event) {
      if (event.target === modal) {
        modal.style.display = 'none';
      }
    };
    
    return modal;
  }

  // Create and render form
  function createForm(formData, container, apiBaseUrl) {
    try {
      // Validate required data
      if (!formData || typeof formData !== 'object') {
        throw new Error('Invalid form data received');
      }
      
      var config = formData.config || {};
      var customFields = config.customFields || [];
      var formToken = formData.publicToken;
      var photographerName = formData.photographerName || 'The Photo CRM';
      
      if (!formToken) {
        throw new Error('Form token missing from response');
      }
    
    // Create form container with strong CSS isolation
    var widget = document.createElement('div');
    widget.style.cssText = 'max-width: 500px !important; padding: 24px !important; border-radius: 8px !important; box-shadow: 0 4px 6px rgba(0,0,0,0.1) !important; box-sizing: border-box !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;';
    widget.style.backgroundColor = validateColor(config.backgroundColor) || '#ffffff';
    widget.style.borderColor = validateColor(config.primaryColor) || '#3b82f6';
    widget.style.borderWidth = '1px';
    widget.style.borderStyle = 'solid';
    
    // Create header
    var header = document.createElement('div');
    header.style.cssText = 'text-align: center !important; margin-bottom: 24px !important;';
    
    var title = document.createElement('h3');
    title.style.cssText = 'font-size: 24px !important; font-weight: 600 !important; margin-bottom: 8px !important; margin-top: 0 !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;';
    title.style.color = validateColor(config.primaryColor) || '#3b82f6';
    title.textContent = config.title || 'Get In Touch';
    
    var description = document.createElement('p');
    description.style.cssText = 'color: #666 !important; margin: 0 !important; font-size: 14px !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;';
    description.textContent = config.description || '';
    
    header.appendChild(title);
    header.appendChild(description);
    
    // Create form
    var form = document.createElement('form');
    form.style.cssText = 'display: flex !important; flex-direction: column !important; gap: 16px !important;';
    
    // Group fields into rows and render them
    var rows = groupFieldsIntoRows(customFields);
    var fieldsHtml = rows.map(function(row) {
      if (row.length === 2) {
        // Two-column row
        return '<div style="display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 16px !important;">' +
          row.map(function(field) { return renderField(field); }).join('') +
        '</div>';
      } else {
        // Full-width single field
        return renderField(row[0]);
      }
    }).join('');
    
    // Create and add privacy policy modal to page
    var privacyModal = createPrivacyPolicyModal(photographerName);
    document.body.appendChild(privacyModal);
    
    // Add SMS consent checkbox if enabled in config
    var smsConsentHtml = '';
    if (config.showSmsConsent) {
      smsConsentHtml = '<div style="margin-bottom: 16px !important;">' +
        '<label style="display: flex !important; align-items: flex-start !important; cursor: pointer !important;">' +
          '<input type="checkbox" name="smsOptIn" value="true" style="margin-right: 8px !important; margin-top: 4px !important; cursor: pointer !important; width: auto !important; height: auto !important; flex-shrink: 0 !important;" />' +
          '<span style="font-size: 12px !important; color: #6b7280 !important; line-height: 1.5 !important; font-family: -apple-system, BlinkMacSystemFont, \\'Segoe UI\\', Roboto, sans-serif !important;">By submitting this form, you agree to receive SMS messages from ThePhotoCRM at the phone number provided. Message & data rates may apply. Message frequency varies based on your interaction with us. You may reply STOP to unsubscribe or HELP for assistance. For details, view our <a href="#" id="privacy-policy-link" style="color: #3b82f6 !important; text-decoration: underline !important; cursor: pointer !important;">Privacy Policy</a> and Terms of Service.</span>' +
        '</label>' +
      '</div>';
    }
    
    // Add submit button with strong styles
    var primaryColor = validateColor(config.primaryColor) || '#3b82f6';
    var buttonHtml = '<button type="submit" style="width: 100% !important; padding: 12px !important; border: none !important; border-radius: 4px !important; color: white !important; font-size: 16px !important; font-weight: 600 !important; cursor: pointer !important; background-color: ' + primaryColor + ' !important; font-family: -apple-system, BlinkMacSystemFont, \\'Segoe UI\\', Roboto, sans-serif !important; box-sizing: border-box !important; transition: opacity 0.2s !important;">' + 
      escapeHtml(config.buttonText || 'Submit') + 
    '</button>';
    
    form.innerHTML = fieldsHtml + smsConsentHtml + buttonHtml;
    
    var submitButton = form.querySelector('button[type="submit"]');
    
    // Assemble widget
    widget.appendChild(header);
    widget.appendChild(form);
    container.appendChild(widget);
    
    // Add privacy policy link event handler
    var privacyLink = document.getElementById('privacy-policy-link');
    if (privacyLink) {
      privacyLink.addEventListener('click', function(e) {
        e.preventDefault();
        privacyModal.style.display = 'block';
      });
    }
    
    // Form submission handler
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      
      var formData = new FormData(form);
      var data = {};
      
      // Collect all field values
      customFields.forEach(function(field) {
        if (field.type === 'checkbox') {
          var values = formData.getAll(field.id);
          data[field.id] = values;
        } else {
          data[field.id] = formData.get(field.id) || '';
        }
      });
      
      // Include SMS consent value
      data.smsOptIn = formData.get('smsOptIn') === 'true';
      
      // Disable submit button
      submitButton.disabled = true;
      submitButton.textContent = 'Submitting...';
      
      // Submit form
      var xhr = new XMLHttpRequest();
      var apiUrl = apiBaseUrl + '/api/public/forms/' + formToken + '/submit';
      xhr.open('POST', apiUrl, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          if (xhr.status === 201) {
            try {
              var response = JSON.parse(xhr.responseText);
              if (response.success) {
                // Handle redirect or show success message
                if (response.redirectUrl && response.redirectUrl.trim()) {
                  window.location.href = response.redirectUrl;
                } else {
                  widget.innerHTML = '<div style="text-align: center; padding: 24px;"><h3 style="color: #059669; margin-bottom: 8px;">Success!</h3><p style="color: #666; margin: 0;">' + escapeHtml(config.successMessage || 'Thank you! We\\'ll be in touch soon.') + '</p></div>';
                }
              } else {
                handleError(response.message || 'Submission failed');
              }
            } catch (e) {
              handleError('Invalid response from server');
            }
          } else {
            handleError('Failed to submit form. Please try again.');
          }
        }
      };
      xhr.send(JSON.stringify(data));
      
      function handleError(message) {
        submitButton.disabled = false;
        submitButton.textContent = config.buttonText || 'Submit';
        
        var errorDiv = form.querySelector('.error-message');
        if (errorDiv) errorDiv.remove();
        
        errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.cssText = 'background-color: #fef2f2; border: 1px solid #fecaca; color: #dc2626; padding: 12px; border-radius: 4px; margin-top: 16px; font-size: 14px;';
        errorDiv.textContent = message;
        form.appendChild(errorDiv);
      }
    });
    } catch (err) {
      console.error('Lead Form Render Error:', err);
      container.innerHTML = '<div style="padding: 20px; text-align: center; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px;"><p style="color: #dc2626; margin: 0; font-weight: 500;">Error loading form</p><p style="color: #9ca3af; font-size: 12px; margin-top: 8px;">Please contact support if this persists.</p></div>';
    }
  }

  // Initialize all forms on the page
  function initForms() {
    var containers = document.querySelectorAll('.photo-crm-form[data-form-token]');
    var apiBaseUrl = getApiBaseUrl();
    
    containers.forEach(function(container) {
      if (container.getAttribute('data-form-initialized')) return;
      container.setAttribute('data-form-initialized', 'true');
      
      var formToken = container.getAttribute('data-form-token');
      
      fetchFormConfig(formToken, apiBaseUrl, function(error, formData) {
        if (error) {
          console.error('Lead Form Error:', error.message);
          container.innerHTML = '<div style="padding: 20px; text-align: center; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px;"><p style="color: #dc2626; margin: 0; font-weight: 500;">Failed to load form</p><p style="color: #9ca3af; font-size: 12px; margin-top: 8px;">Form may be inactive or token is invalid.</p></div>';
          return;
        }
        
        createForm(formData, container, apiBaseUrl);
      });
    });
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initForms);
  } else {
    initForms();
  }
})();`;

export const BOOKING_EMBED_SCRIPT = `/**
 * Booking Calendar Embed Script
 * Dynamically renders a mini month calendar with booking functionality
 */
(function() {
  'use strict';

  // HTML escape function to prevent XSS
  function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    var map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
  }

  // Color validation function
  function validateColor(color) {
    if (!color) return null;
    var hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexRegex.test(color) ? color : null;
  }

  // Get API base URL from script source
  function getApiBaseUrl() {
    var scriptSrc = document.currentScript ? document.currentScript.src :
                    (document.querySelector('script[src*="/widget/booking-embed.js"]') || {}).src;
    return scriptSrc ? new URL(scriptSrc).origin : window.location.origin;
  }

  // Format time from 24-hour to 12-hour format
  function formatTime12Hour(time) {
    var parts = time.split(':');
    var hours = parseInt(parts[0], 10);
    var minutes = parts[1];
    var ampm = hours >= 12 ? 'PM' : 'AM';
    var displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return displayHour + ':' + minutes + ' ' + ampm;
  }

  // Format date for display
  function formatDateDisplay(date) {
    var months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
    var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()] + ', ' + months[date.getMonth()] + ' ' + date.getDate();
  }

  // Format date as YYYY-MM-DD
  function formatDateISO(date) {
    var year = date.getFullYear();
    var month = String(date.getMonth() + 1).padStart(2, '0');
    var day = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  // Fetch photographer config
  function fetchConfig(token, apiBaseUrl, callback) {
    var apiUrl = apiBaseUrl + '/api/public/booking/calendar/' + token;

    var xhr = new XMLHttpRequest();
    xhr.open('GET', apiUrl, true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          try {
            var response = JSON.parse(xhr.responseText);
            callback(null, response);
          } catch (e) {
            callback(new Error('Invalid response from server'));
          }
        } else {
          callback(new Error('Failed to load booking calendar: ' + xhr.status));
        }
      }
    };
    xhr.send();
  }

  // Fetch available slots for a date
  function fetchSlots(token, date, apiBaseUrl, callback) {
    var apiUrl = apiBaseUrl + '/api/public/booking/calendar/' + token + '/slots/' + date;

    var xhr = new XMLHttpRequest();
    xhr.open('GET', apiUrl, true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          try {
            var response = JSON.parse(xhr.responseText);
            callback(null, response);
          } catch (e) {
            callback(new Error('Invalid response from server'));
          }
        } else {
          callback(new Error('Failed to load available slots'));
        }
      }
    };
    xhr.send();
  }

  // Create booking
  function createBooking(token, date, slotId, data, apiBaseUrl, callback) {
    var apiUrl = apiBaseUrl + '/api/public/booking/calendar/' + token + '/book/' + date + '/' + slotId;

    var xhr = new XMLHttpRequest();
    xhr.open('POST', apiUrl, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status === 200 || xhr.status === 201) {
          try {
            var response = JSON.parse(xhr.responseText);
            callback(null, response);
          } catch (e) {
            callback(new Error('Invalid response from server'));
          }
        } else {
          try {
            var errorResponse = JSON.parse(xhr.responseText);
            callback(new Error(errorResponse.message || 'Failed to create booking'));
          } catch (e) {
            callback(new Error('Failed to create booking'));
          }
        }
      }
    };
    xhr.send(JSON.stringify(data));
  }

  // Check if a date has availability based on daily templates
  function hasAvailability(date, dailyTemplates) {
    var dayOfWeek = date.getDay();
    var template = dailyTemplates.find(function(t) {
      return t.dayOfWeek === dayOfWeek && t.isEnabled;
    });
    return !!template;
  }

  // Create and render the booking widget
  function createWidget(config, container, token, apiBaseUrl) {
    try {
      var photographer = config.photographer;
      var dailyTemplates = config.dailyTemplates || [];
      var primaryColor = validateColor(photographer.brandPrimary) || '#3b82f6';

      // State
      var currentMonth = new Date();
      currentMonth.setDate(1);
      var selectedDate = null;
      var selectedSlot = null;
      var availableSlots = [];

      // Create widget container
      var widget = document.createElement('div');
      widget.style.cssText = 'max-width: 400px !important; border-radius: 12px !important; box-shadow: 0 4px 20px rgba(0,0,0,0.1) !important; box-sizing: border-box !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important; background: white !important; overflow: hidden !important;';

      // Header with photographer info
      var header = document.createElement('div');
      header.style.cssText = 'padding: 20px !important; text-align: center !important; border-bottom: 1px solid #e5e7eb !important;';
      header.style.backgroundColor = primaryColor;

      var businessName = document.createElement('h3');
      businessName.style.cssText = 'font-size: 18px !important; font-weight: 600 !important; margin: 0 !important; color: white !important; font-family: inherit !important;';
      businessName.textContent = escapeHtml(photographer.businessName || 'Book an Appointment');

      var subtitle = document.createElement('p');
      subtitle.style.cssText = 'font-size: 14px !important; margin: 4px 0 0 0 !important; color: rgba(255,255,255,0.9) !important; font-family: inherit !important;';
      subtitle.textContent = 'Select a date and time';

      header.appendChild(businessName);
      header.appendChild(subtitle);

      // Content area
      var content = document.createElement('div');
      content.style.cssText = 'padding: 16px !important;';

      // Calendar container
      var calendarContainer = document.createElement('div');
      calendarContainer.id = 'booking-calendar-' + Math.random().toString(36).substr(2, 9);

      // Slots container (hidden initially)
      var slotsContainer = document.createElement('div');
      slotsContainer.id = 'booking-slots-' + Math.random().toString(36).substr(2, 9);
      slotsContainer.style.cssText = 'display: none !important;';

      // Form container (hidden initially)
      var formContainer = document.createElement('div');
      formContainer.id = 'booking-form-' + Math.random().toString(36).substr(2, 9);
      formContainer.style.cssText = 'display: none !important;';

      // Success container (hidden initially)
      var successContainer = document.createElement('div');
      successContainer.id = 'booking-success-' + Math.random().toString(36).substr(2, 9);
      successContainer.style.cssText = 'display: none !important;';

      content.appendChild(calendarContainer);
      content.appendChild(slotsContainer);
      content.appendChild(formContainer);
      content.appendChild(successContainer);

      widget.appendChild(header);
      widget.appendChild(content);
      container.appendChild(widget);

      // Render calendar
      function renderCalendar() {
        var months = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
        var days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

        var today = new Date();
        today.setHours(0, 0, 0, 0);

        var year = currentMonth.getFullYear();
        var month = currentMonth.getMonth();
        var firstDay = new Date(year, month, 1);
        var lastDay = new Date(year, month + 1, 0);
        var startDayOfWeek = firstDay.getDay();
        var daysInMonth = lastDay.getDate();

        var html = '';

        // Navigation
        html += '<div style="display: flex !important; align-items: center !important; justify-content: space-between !important; margin-bottom: 16px !important;">';
        html += '<button class="prev-month-btn" style="background: none !important; border: 1px solid #e5e7eb !important; border-radius: 6px !important; padding: 8px 12px !important; cursor: pointer !important; font-size: 16px !important; color: #374151 !important;">&#8249;</button>';
        html += '<span style="font-weight: 600 !important; font-size: 16px !important; color: #1f2937 !important;">' + months[month] + ' ' + year + '</span>';
        html += '<button class="next-month-btn" style="background: none !important; border: 1px solid #e5e7eb !important; border-radius: 6px !important; padding: 8px 12px !important; cursor: pointer !important; font-size: 16px !important; color: #374151 !important;">&#8250;</button>';
        html += '</div>';

        // Day headers
        html += '<div style="display: grid !important; grid-template-columns: repeat(7, 1fr) !important; gap: 4px !important; margin-bottom: 8px !important;">';
        days.forEach(function(day) {
          html += '<div style="text-align: center !important; font-size: 12px !important; font-weight: 500 !important; color: #6b7280 !important; padding: 4px !important;">' + day + '</div>';
        });
        html += '</div>';

        // Calendar grid
        html += '<div style="display: grid !important; grid-template-columns: repeat(7, 1fr) !important; gap: 4px !important;">';

        // Empty cells before first day
        for (var i = 0; i < startDayOfWeek; i++) {
          html += '<div style="padding: 8px !important;"></div>';
        }

        // Days
        for (var day = 1; day <= daysInMonth; day++) {
          var date = new Date(year, month, day);
          var isPast = date < today;
          var hasSlots = !isPast && hasAvailability(date, dailyTemplates);
          var dateStr = formatDateISO(date);

          var cellStyle = 'text-align: center !important; padding: 8px !important; border-radius: 6px !important; font-size: 14px !important; position: relative !important;';

          if (isPast) {
            cellStyle += ' color: #d1d5db !important; cursor: default !important;';
            html += '<div style="' + cellStyle + '">' + day + '</div>';
          } else if (hasSlots) {
            cellStyle += ' color: #1f2937 !important; cursor: pointer !important; background: #f3f4f6 !important;';
            html += '<div class="calendar-day" data-date="' + dateStr + '" style="' + cellStyle + '">';
            html += day;
            html += '<span style="position: absolute !important; bottom: 2px !important; left: 50% !important; transform: translateX(-50%) !important; width: 4px !important; height: 4px !important; border-radius: 50% !important; background: ' + primaryColor + ' !important;"></span>';
            html += '</div>';
          } else {
            cellStyle += ' color: #9ca3af !important; cursor: default !important;';
            html += '<div style="' + cellStyle + '">' + day + '</div>';
          }
        }

        html += '</div>';

        calendarContainer.innerHTML = html;

        // Add event listeners
        var prevBtn = calendarContainer.querySelector('.prev-month-btn');
        var nextBtn = calendarContainer.querySelector('.next-month-btn');

        if (prevBtn) {
          prevBtn.onclick = function() {
            currentMonth.setMonth(currentMonth.getMonth() - 1);
            renderCalendar();
          };
        }

        if (nextBtn) {
          nextBtn.onclick = function() {
            currentMonth.setMonth(currentMonth.getMonth() + 1);
            renderCalendar();
          };
        }

        // Day click handlers
        var dayElements = calendarContainer.querySelectorAll('.calendar-day');
        dayElements.forEach(function(el) {
          el.onmouseover = function() {
            el.style.backgroundColor = primaryColor;
            el.style.color = 'white';
          };
          el.onmouseout = function() {
            el.style.backgroundColor = '#f3f4f6';
            el.style.color = '#1f2937';
          };
          el.onclick = function() {
            var dateStr = el.getAttribute('data-date');
            selectedDate = dateStr;
            loadSlots(dateStr);
          };
        });
      }

      // Load and render slots
      function loadSlots(dateStr) {
        slotsContainer.style.display = 'block';
        slotsContainer.innerHTML = '<div style="text-align: center !important; padding: 20px !important; color: #6b7280 !important;">Loading available times...</div>';

        fetchSlots(token, dateStr, apiBaseUrl, function(error, data) {
          if (error) {
            slotsContainer.innerHTML = '<div style="text-align: center !important; padding: 20px !important; color: #dc2626 !important;">Failed to load available times</div>';
            return;
          }

          availableSlots = data.slots || [];
          renderSlots(dateStr);
        });
      }

      // Render time slots
      function renderSlots(dateStr) {
        var date = new Date(dateStr + 'T12:00:00');
        var html = '';

        // Back button and date header
        html += '<div style="display: flex !important; align-items: center !important; margin-bottom: 16px !important;">';
        html += '<button class="back-to-calendar-btn" style="background: none !important; border: none !important; cursor: pointer !important; font-size: 20px !important; color: #6b7280 !important; padding: 4px 8px 4px 0 !important;">&#8249;</button>';
        html += '<span style="font-weight: 600 !important; font-size: 14px !important; color: #1f2937 !important;">' + formatDateDisplay(date) + '</span>';
        html += '</div>';

        if (availableSlots.length === 0) {
          html += '<div style="text-align: center !important; padding: 20px !important; color: #6b7280 !important; background: #f9fafb !important; border-radius: 8px !important;">No available times for this date</div>';
        } else {
          html += '<div style="display: grid !important; grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important;">';
          availableSlots.forEach(function(slot) {
            var timeDisplay = formatTime12Hour(slot.startTime);
            html += '<button class="slot-btn" data-slot-id="' + escapeHtml(slot.id) + '" style="padding: 12px !important; border: 1px solid #e5e7eb !important; border-radius: 8px !important; background: white !important; cursor: pointer !important; font-size: 14px !important; font-weight: 500 !important; color: #374151 !important; transition: all 0.2s !important;">' + timeDisplay + '</button>';
          });
          html += '</div>';
        }

        slotsContainer.innerHTML = html;

        // Back button handler
        var backBtn = slotsContainer.querySelector('.back-to-calendar-btn');
        if (backBtn) {
          backBtn.onclick = function() {
            slotsContainer.style.display = 'none';
            selectedDate = null;
            selectedSlot = null;
          };
        }

        // Slot button handlers
        var slotBtns = slotsContainer.querySelectorAll('.slot-btn');
        slotBtns.forEach(function(btn) {
          btn.onmouseover = function() {
            btn.style.borderColor = primaryColor;
            btn.style.backgroundColor = primaryColor;
            btn.style.color = 'white';
          };
          btn.onmouseout = function() {
            btn.style.borderColor = '#e5e7eb';
            btn.style.backgroundColor = 'white';
            btn.style.color = '#374151';
          };
          btn.onclick = function() {
            selectedSlot = btn.getAttribute('data-slot-id');
            renderForm();
          };
        });
      }

      // Render booking form
      function renderForm() {
        var slot = availableSlots.find(function(s) { return s.id === selectedSlot; });
        if (!slot) return;

        var date = new Date(selectedDate + 'T12:00:00');
        var timeDisplay = formatTime12Hour(slot.startTime) + ' - ' + formatTime12Hour(slot.endTime);

        slotsContainer.style.display = 'none';
        formContainer.style.display = 'block';

        var labelStyle = 'display: block !important; font-size: 14px !important; font-weight: 500 !important; margin-bottom: 4px !important; color: #374151 !important;';
        var inputStyle = 'width: 100% !important; padding: 10px !important; border: 1px solid #d1d5db !important; border-radius: 6px !important; font-size: 14px !important; background: white !important; color: #1f2937 !important; box-sizing: border-box !important;';

        var html = '';

        // Back button and header
        html += '<div style="display: flex !important; align-items: center !important; margin-bottom: 16px !important;">';
        html += '<button class="back-to-slots-btn" style="background: none !important; border: none !important; cursor: pointer !important; font-size: 20px !important; color: #6b7280 !important; padding: 4px 8px 4px 0 !important;">&#8249;</button>';
        html += '<span style="font-weight: 600 !important; font-size: 14px !important; color: #1f2937 !important;">Complete Your Booking</span>';
        html += '</div>';

        // Selected time summary
        html += '<div style="background: #f3f4f6 !important; border-radius: 8px !important; padding: 12px !important; margin-bottom: 16px !important;">';
        html += '<div style="font-weight: 500 !important; color: #1f2937 !important; font-size: 14px !important;">' + formatDateDisplay(date) + '</div>';
        html += '<div style="color: #6b7280 !important; font-size: 13px !important;">' + timeDisplay + '</div>';
        html += '</div>';

        // Form fields
        html += '<form class="booking-details-form">';

        html += '<div style="margin-bottom: 12px !important;">';
        html += '<label style="' + labelStyle + '">Name *</label>';
        html += '<input type="text" name="clientName" required style="' + inputStyle + '" placeholder="Your full name" />';
        html += '</div>';

        html += '<div style="margin-bottom: 12px !important;">';
        html += '<label style="' + labelStyle + '">Email *</label>';
        html += '<input type="email" name="clientEmail" required style="' + inputStyle + '" placeholder="your@email.com" />';
        html += '</div>';

        html += '<div style="margin-bottom: 12px !important;">';
        html += '<label style="' + labelStyle + '">Phone</label>';
        html += '<input type="tel" name="clientPhone" style="' + inputStyle + '" placeholder="(555) 123-4567" />';
        html += '</div>';

        html += '<div style="margin-bottom: 16px !important;">';
        html += '<label style="' + labelStyle + '">Notes</label>';
        html += '<textarea name="bookingNotes" rows="3" style="' + inputStyle + ' resize: vertical !important;" placeholder="Any details you\\'d like us to know"></textarea>';
        html += '</div>';

        html += '<button type="submit" style="width: 100% !important; padding: 12px !important; border: none !important; border-radius: 8px !important; color: white !important; font-size: 16px !important; font-weight: 600 !important; cursor: pointer !important; background-color: ' + primaryColor + ' !important;">Confirm Booking</button>';

        html += '</form>';

        formContainer.innerHTML = html;

        // Back button handler
        var backBtn = formContainer.querySelector('.back-to-slots-btn');
        if (backBtn) {
          backBtn.onclick = function() {
            formContainer.style.display = 'none';
            slotsContainer.style.display = 'block';
            selectedSlot = null;
          };
        }

        // Form submit handler
        var form = formContainer.querySelector('.booking-details-form');
        if (form) {
          form.onsubmit = function(e) {
            e.preventDefault();

            var submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Booking...';

            var formData = new FormData(form);
            var data = {
              clientName: formData.get('clientName'),
              clientEmail: formData.get('clientEmail'),
              clientPhone: formData.get('clientPhone') || '',
              bookingNotes: formData.get('bookingNotes') || ''
            };

            createBooking(token, selectedDate, selectedSlot, data, apiBaseUrl, function(error, response) {
              if (error) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Confirm Booking';

                var errorDiv = form.querySelector('.error-message');
                if (errorDiv) errorDiv.remove();

                errorDiv = document.createElement('div');
                errorDiv.className = 'error-message';
                errorDiv.style.cssText = 'background-color: #fef2f2 !important; border: 1px solid #fecaca !important; color: #dc2626 !important; padding: 12px !important; border-radius: 6px !important; margin-top: 12px !important; font-size: 14px !important;';
                errorDiv.textContent = error.message;
                form.appendChild(errorDiv);
                return;
              }

              renderSuccess(response);
            });
          };
        }
      }

      // Render success message
      function renderSuccess(response) {
        formContainer.style.display = 'none';
        successContainer.style.display = 'block';

        var slot = availableSlots.find(function(s) { return s.id === selectedSlot; });
        var date = new Date(selectedDate + 'T12:00:00');
        var timeDisplay = slot ? formatTime12Hour(slot.startTime) + ' - ' + formatTime12Hour(slot.endTime) : '';

        var html = '';
        html += '<div style="text-align: center !important; padding: 20px !important;">';
        html += '<div style="width: 64px !important; height: 64px !important; border-radius: 50% !important; background: #dcfce7 !important; display: flex !important; align-items: center !important; justify-content: center !important; margin: 0 auto 16px !important;">';
        html += '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
        html += '</div>';
        html += '<h3 style="font-size: 20px !important; font-weight: 600 !important; color: #1f2937 !important; margin: 0 0 8px 0 !important;">Booking Confirmed!</h3>';
        html += '<p style="color: #6b7280 !important; margin: 0 0 16px 0 !important; font-size: 14px !important;">You\\'ll receive a confirmation email shortly.</p>';
        html += '<div style="background: #f3f4f6 !important; border-radius: 8px !important; padding: 16px !important; text-align: left !important;">';
        html += '<div style="font-weight: 500 !important; color: #1f2937 !important; margin-bottom: 4px !important;">' + formatDateDisplay(date) + '</div>';
        html += '<div style="color: #6b7280 !important; font-size: 14px !important;">' + timeDisplay + '</div>';
        html += '</div>';
        html += '<button class="book-another-btn" style="margin-top: 16px !important; padding: 10px 20px !important; border: 1px solid #e5e7eb !important; border-radius: 6px !important; background: white !important; cursor: pointer !important; font-size: 14px !important; color: #374151 !important;">Book Another Time</button>';
        html += '</div>';

        successContainer.innerHTML = html;

        // Book another handler
        var bookAnotherBtn = successContainer.querySelector('.book-another-btn');
        if (bookAnotherBtn) {
          bookAnotherBtn.onclick = function() {
            successContainer.style.display = 'none';
            selectedDate = null;
            selectedSlot = null;
            availableSlots = [];
            renderCalendar();
          };
        }
      }

      // Initial render
      renderCalendar();

    } catch (err) {
      console.error('Booking Widget Render Error:', err);
      container.innerHTML = '<div style="padding: 20px; text-align: center; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px;"><p style="color: #dc2626; margin: 0; font-weight: 500;">Error loading booking calendar</p><p style="color: #9ca3af; font-size: 12px; margin-top: 8px;">Please contact support if this persists.</p></div>';
    }
  }

  // Initialize all booking widgets on the page
  function initWidgets() {
    var containers = document.querySelectorAll('.photo-crm-booking[data-photographer-token]');
    var apiBaseUrl = getApiBaseUrl();

    containers.forEach(function(container) {
      if (container.getAttribute('data-widget-initialized')) return;
      container.setAttribute('data-widget-initialized', 'true');

      var token = container.getAttribute('data-photographer-token');

      // Show loading state
      container.innerHTML = '<div style="padding: 40px; text-align: center; color: #6b7280;">Loading booking calendar...</div>';

      fetchConfig(token, apiBaseUrl, function(error, config) {
        if (error) {
          console.error('Booking Widget Error:', error.message);
          container.innerHTML = '<div style="padding: 20px; text-align: center; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px;"><p style="color: #dc2626; margin: 0; font-weight: 500;">Failed to load booking calendar</p><p style="color: #9ca3af; font-size: 12px; margin-top: 8px;">Calendar may be inactive or token is invalid.</p></div>';
          return;
        }

        container.innerHTML = '';
        createWidget(config, container, token, apiBaseUrl);
      });
    });
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidgets);
  } else {
    initWidgets();
  }
})();`;
