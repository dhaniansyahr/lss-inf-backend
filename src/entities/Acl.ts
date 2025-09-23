export interface AclDTO {
    name: string;
    enabledFeatures: Record<string, boolean>;
}

export interface CheckFeatureAccessDTO {
    featureName: string;
    actions: string[];
}
