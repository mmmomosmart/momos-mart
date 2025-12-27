export interface OrderItem {
    name: string;
    portion: 'Half' | 'Full';
    price: number;
    quantity: number;
    total: number;
}


export interface Order {
    invoiceNumber: string;
    createdOn: {
        date: string; // dd/MM/yyyy
        time: string;
    };
    items: OrderItem[];
    total: number;
}


export interface OrderGroup {
    key: string;
    orders: Order[];
    total: number;
}