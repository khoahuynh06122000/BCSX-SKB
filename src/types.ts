/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Category = 'Lon' | 'Lít' | 'Chai';
export type TransactionType = 'IN' | 'OUT' | 'OPENING' | 'LOSS' | 'DAMAGE';
export type UserRole = 'OWNER' | 'STAFF' | 'VIEWER';

export interface UserConfig {
  id?: string;
  username: string;
  password?: string;
  role: UserRole;
  name?: string;
  updatedAt?: string;
  pin?: string; // mã PIN 6 số
  linkedUid?: string; // Firebase Auth UID
  recoveryCode?: string;
  recoveryExpiry?: string;
}

export interface Product {
  id: string;
  name: string;
  category: Category;
  unit: string; // e.g., 'Thùng', 'Bom', 'Két'
  price: number; // Giá trị ước tính trên mỗi đơn vị (VNĐ)
  conversionFactor?: number; // e.g., số lượng đơn vị quy đổi (1 thùng = 24 lon, hoặc 1 lít = 1000ml)
  capacityPerUnit: number; // Trong ml (ví dụ: 330(ml) cho lon, 20000(ml) cho bom bia hơi)
}

export interface Partner {
  id: string;
  sapCode?: string; // Mã SAP
  name: string;
  phone?: string;
  address?: string;
  type: 'SUPPLIER' | 'AGENT' | 'RESTAURANT' | 'INDIVIDUAL';
}

export interface Transaction {
  id: string;
  date: string; // ISO string
  type: TransactionType;
  productId: string;
  productName: string; // Denormalized for storage/history
  category: Category;
  quantity: number;
  partnerId: string;
  partnerName: string; // Denormalized
  notes?: string;
  batchNumber?: string; // Số lô
  evidencePhotoUrl?: string; // Ảnh biên bản
  evidencePhotoUrls?: string[]; // Multiple evidence photos
  createdBy: string; // Người thực hiện
  referenceGroupId?: string; // To group split transactions (e.g., one export split into multiple batches)
  status?: 'completed' | 'in_transit'; // Default: completed
  originalQuantity?: number; // Store original qty if reported as loss
  deliveryDate?: string; // Date when actually received
}

export interface BatchInfo {
  batchNumber: string;
  productId: string;
  productName: string;
  category: Category;
  stock: number;
  importDate: string;
  lastExportDate?: string;
}

export interface InventoryItem {
  productId: string;
  productName: string;
  category: Category;
  unit: string;
  stock: number;
  totalLiters: number;
  minStock: number;
}

export interface RevenueRecord {
  id: string;
  date: string;
  productName: string;
  materialCode?: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  vatAmount?: number;
  invoiceNumber?: string;
  partnerName: string;
  partnerId?: string;
  deptCode?: string;
}
