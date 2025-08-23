export interface MessageHistoryModel {
    id: number,
    schedule_name: string,
    recipient_name: string,
    send_date: Date,
    status: string,
    log_message: string
}