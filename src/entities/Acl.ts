export interface AclDTO {
    roleName: string;
    permissions: {
        subject: string;
        action: string[];
    }[];
}

export interface CheckFeatureAccessDTO {
    featureName: string;
    actions: string[];
}
