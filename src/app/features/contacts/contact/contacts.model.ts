export interface ContactModel {
    id: string,
    name: string,
    description: string,
    phone: string,
    image: string,
    address: string,
    category: string,
    organization: number,
    created_by: number,
    platform_name: string,
    platform_id?: number,  // ✅ Added
    user_platform_name?: string,  // ✅ Added (read-only from API)
    custom_fields: {}
}