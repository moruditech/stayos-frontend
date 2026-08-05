export interface Room {
  _id: string;
  tenantId: string;
  name: string;
  type: string;
  capacity: number;
  bedCount: number;
  amenities: string[];
  status: string; // e.g. clean, dirty, occupied, out_of_order — status-board driven
  images: RoomImage[];
  createdAt: string;
  updatedAt: string;
}

export interface RoomImage {
  _id: string;
  url: string;
  order: number;
}

export interface RoomBlock {
  _id: string;
  roomId: string;
  startDate: string;
  endDate: string;
  reason: string;
}
