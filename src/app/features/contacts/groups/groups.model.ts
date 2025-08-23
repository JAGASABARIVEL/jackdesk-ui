
export interface ContactModel {
    id: number,
    name: string,
    description: string,
    phone: string,
    image: string,
    address: string,
    category: string,
    organization: number,
    created_by: number
}

export interface MemberModel {
    id: number,
    contact: ContactModel
}

export interface GroupModel {
    id: number,
    name: string,
    description: string,
    category: string,
    member_count: number,
    members: MemberModel[],
    member_ids: number[]
}
