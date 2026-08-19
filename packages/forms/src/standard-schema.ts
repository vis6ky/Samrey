/**
 * @license Apache-2.0
 * @aether/forms - Standard Schema Compatibility Specification (~v1)
 */

export interface StandardSchemaIssue {
  message: string;
  path?: (string | number)[];
}

export interface StandardSchemaSuccess<T> {
  value: T;
  issues?: undefined;
}

export interface StandardSchemaFailure {
  issues: readonly StandardSchemaIssue[];
}

export type StandardSchemaResult<T> = StandardSchemaSuccess<T> | StandardSchemaFailure;

export interface StandardSchemaV1<TInput = unknown, TOutput = TInput> {
  '~standard': {
    version: 1;
    vendor: string;
    validate: (value: unknown) => StandardSchemaResult<TOutput> | Promise<StandardSchemaResult<TOutput>>;
  };
}

export type Validator<T> = (value: T) => string | null | undefined;
