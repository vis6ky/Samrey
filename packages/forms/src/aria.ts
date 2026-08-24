/**
 * @license Apache-2.0
 * @gati/forms - Dynamic ARIA Attributes Generator
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
  const hasError = !!(field?.error?.value || field?.error);
  const name = field?.name || 'field';
  return computeAriaAttributes(name, hasError, false);
}
