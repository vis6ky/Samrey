/**
 * @license Apache-2.0
 * @samrey/forms - Dynamic ARIA Attributes Generator
 */

export interface AriaBindingAttributes {
  'aria-invalid'?: boolean;
  'aria-errormessage'?: string;
  'aria-describedby'?: string;
  'aria-required'?: boolean;
}

export function computeAriaAttributes(
  fieldId: string,
  hasError: boolean,
  required = false
): AriaBindingAttributes {
  const attrs: AriaBindingAttributes = {};

  if (required) {
    attrs['aria-required'] = true;
  }

  if (hasError) {
    attrs['aria-invalid'] = true;
    attrs['aria-errormessage'] = `${fieldId}-error`;
    attrs['aria-describedby'] = `${fieldId}-error`;
  }

  return attrs;
}

export function getAccessibleFieldProps(field: any): AriaBindingAttributes {
  const errObj = field?.error;
  const errVal =
    typeof errObj === 'function' && 'value' in errObj
      ? errObj.value
      : typeof errObj === 'object' && errObj !== null && 'value' in errObj
        ? errObj.value
        : errObj;
  const hasError = Boolean(errVal);
  const name = typeof field?.name === 'string' && field.name ? field.name : 'field';
  return computeAriaAttributes(name, hasError, Boolean(field?.required));
}
