export interface DeliveryTrip {
  name: string;
  driver?: string;
  driver_name?: string;
  status: string;
  company?: string;
  departure_time?: string;
  total_stops?: number;
  completed_stops?: number;
}

export interface DeliveryStop {
  name: string;
  parent: string; // The Delivery Trip ID
  customer: string;
  address?: string;
  status: string;
  contact_person?: string;
  direction?: string; // Deliver / Return
  documents?: string; // Reference to Stock Fulfillment
  stock_fulfillment?: string; // Legacy reference
  fulfillment_doc?: string; // New reference
  visited?: number;
}

export interface StockFulfillment {
  name: string;
  operation_order?: string;
  status: string;
}

export interface OperationOrder {
  name: string;
  customer?: string;
  status: string;
}

export interface DeliveryForm {
  name?: string;
  delivery_trip: string;
  hospital: string;
  fulfillment_doc: string;
  direction: string;
  user_id: string;
  status: string;
  items?: Array<{
    item_code: string;
    serial_no?: string;
  }>;
  details?: Array<any>;
}
