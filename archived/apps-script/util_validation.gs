/**
 * @fileoverview Lightweight schema validation helpers.
 */

/**
 * Validates a payload against a JSON-like schema.
 * Supports type checks, enums, and string length constraints.
 * @param {!Object} schema Validation schema definition.
 * @param {*} payload Payload to validate.
 * @returns {{valid:boolean, value:*, errors:!Array<string>}}
 */
function validateSchema(schema, payload) {
  if (!schema || typeof schema !== 'object') {
    throw new Error('Schema is required.');
  }

  var errors = [];
  var value = {};

  if (schema.type === 'object') {
    if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
      return { valid: false, value: {}, errors: ['Payload must be an object.'] };
    }
    var required = schema.required || [];
    required.forEach(function(field) {
      if (!Object.prototype.hasOwnProperty.call(payload, field)) {
        errors.push('Missing required field: ' + field);
      }
    });

    var properties = schema.properties || {};
    Object.keys(properties).forEach(function(key) {
      var definition = properties[key];
      if (!Object.prototype.hasOwnProperty.call(payload, key)) {
        return;
      }
      var result = validateSchema(definition, payload[key]);
      if (!result.valid) {
        result.errors.forEach(function(err) {
          errors.push(key + ': ' + err);
        });
        return;
      }
      value[key] = result.value;
    });

    if (errors.length) {
      return { valid: false, value: {}, errors: errors };
    }
    return { valid: true, value: value, errors: [] };
  }

  var incoming = payload;
  if (schema.type === 'string') {
    if (incoming === null || incoming === undefined) {
      return { valid: false, value: '', errors: ['Value must be provided.'] };
    }
    var stringValue = String(incoming);
    if (schema.trim !== false) {
      stringValue = stringValue.trim();
    }
    if (schema.minLength && stringValue.length < schema.minLength) {
      errors.push('String shorter than minimum length of ' + schema.minLength + '.');
    }
    if (schema.maxLength && stringValue.length > schema.maxLength) {
      errors.push('String exceeds maximum length of ' + schema.maxLength + '.');
    }
    if (schema.pattern) {
      var regex = new RegExp(schema.pattern);
      if (!regex.test(stringValue)) {
        errors.push('String does not match required pattern.');
      }
    }
    if (schema.enum && schema.enum.indexOf(stringValue) === -1) {
      errors.push('Value must be one of: ' + schema.enum.join(', '));
    }
    return { valid: errors.length === 0, value: stringValue, errors: errors };
  }

  if (schema.type === 'number') {
    var numberValue = Number(incoming);
    if (!isFinite(numberValue)) {
      return { valid: false, value: 0, errors: ['Value must be a number.'] };
    }
    if (schema.minimum !== undefined && numberValue < schema.minimum) {
      errors.push('Number must be at least ' + schema.minimum + '.');
    }
    if (schema.maximum !== undefined && numberValue > schema.maximum) {
      errors.push('Number must be at most ' + schema.maximum + '.');
    }
    return { valid: errors.length === 0, value: numberValue, errors: errors };
  }

  if (schema.type === 'boolean') {
    if (incoming === true || incoming === false) {
      return { valid: true, value: incoming, errors: [] };
    }
    if (incoming === 'true' || incoming === 'false') {
      return { valid: true, value: incoming === 'true', errors: [] };
    }
    return { valid: false, value: false, errors: ['Value must be a boolean.'] };
  }

  if (schema.type === 'array') {
    if (!Array.isArray(incoming)) {
      return { valid: false, value: [], errors: ['Value must be an array.'] };
    }
    var itemsSchema = schema.items || {};
    var sanitized = [];
    incoming.forEach(function(item, index) {
      if (!itemsSchema.type) {
        sanitized.push(item);
        return;
      }
      var validation = validateSchema(itemsSchema, item);
      if (!validation.valid) {
        validation.errors.forEach(function(err) {
          errors.push('[' + index + ']: ' + err);
        });
        return;
      }
      sanitized.push(validation.value);
    });
    return { valid: errors.length === 0, value: sanitized, errors: errors };
  }

  if (schema.enum && schema.enum.indexOf(incoming) === -1) {
    return { valid: false, value: incoming, errors: ['Value not permitted.'] };
  }

  return { valid: true, value: incoming, errors: [] };
}

/**
 * Extracts pagination values from headers or parameters.
 * @param {!Object<string,string>} headers Normalised header map.
 * @param {!Object<string,string>} params Query parameters map.
 * @returns {{page:number, perPage:number}}
 */
function extractPagination(headers, params) {
  var pageHeader = headers['x-page'] || headers['page'] || (params && params.page);
  var perPageHeader = headers['x-per-page'] || headers['per-page'] || (params && params.perPage);

  var page = parseInt(pageHeader, 10);
  if (!isFinite(page) || page < 1) {
    page = 1;
  }

  var perPage = parseInt(perPageHeader, 10);
  if (!isFinite(perPage) || perPage < 1 || perPage > 100) {
    perPage = 25;
  }

  return { page: page, perPage: perPage };
}
