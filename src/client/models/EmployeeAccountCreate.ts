/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type EmployeeAccountCreate = {
    /**
     * Employee role name (default: Operator).
     */
    role?: (string | null);
    password: string;
    username: string;
    /**
     * Employee full name (required for CSV import).
     */
    full_name?: (string | null);
    /**
     * Department code/abbreviation (required for CSV import).
     */
    department?: (string | null);
    /**
     * Employee ID number (distinct from account username; required for CSV import).
     */
    idno?: (string | null);
    /**
     * Employee level as integer (required for CSV import).
     */
    level?: (number | null);
};

