import type { Invoice } from '@/lib/types'

export const mockInvoices: Invoice[] = [
  {
    id: '1',
    invoiceNumber: 'INV-2024-001',
    customerId: '1',
    customerName: 'Acme Corporation',
    customerEmail: 'purchasing@acme.com',
    items: [
      {
        id: '1-1',
        productId: '1',
        productName: 'Wireless Bluetooth Headphones',
        productSku: 'SKU-001',
        quantity: 10,
        unitPrice: 149.99,
        taxRate: 8,
        discount: 5,
        total: 1424.91
      },
      {
        id: '1-2',
        productId: '5',
        productName: 'Mechanical Gaming Keyboard',
        productSku: 'SKU-005',
        quantity: 5,
        unitPrice: 139.99,
        taxRate: 8,
        discount: 0,
        total: 755.95
      }
    ],
    subtotal: 2199.85,
    taxAmount: 175.99,
    discountAmount: 75.00,
    total: 2300.84,
    status: 'paid',
    paymentMethod: 'bank_transfer',
    template: 'retail',
    notes: 'Bulk order - expedited shipping requested',
    dueDate: '2024-02-15T00:00:00Z',
    createdAt: '2024-01-15T10:30:00Z',
    createdBy: 'John Smith'
  },
  {
    id: '2',
    invoiceNumber: 'INV-2024-002',
    customerId: '3',
    customerName: 'Global Solutions LLC',
    customerEmail: 'procurement@globalsolutions.com',
    items: [
      {
        id: '2-1',
        productId: '2',
        productName: 'Ergonomic Office Chair',
        productSku: 'SKU-002',
        quantity: 20,
        unitPrice: 349.99,
        taxRate: 8,
        discount: 10,
        total: 6299.82
      },
      {
        id: '2-2',
        productId: '4',
        productName: 'Standing Desk Converter',
        productSku: 'SKU-004',
        quantity: 15,
        unitPrice: 279.99,
        taxRate: 8,
        discount: 5,
        total: 3989.86
      }
    ],
    subtotal: 11199.65,
    taxAmount: 895.97,
    discountAmount: 1119.97,
    total: 10975.65,
    status: 'pending',
    paymentMethod: 'credit_card',
    template: 'bulk',
    notes: 'Net 45 terms applied',
    dueDate: '2024-03-01T00:00:00Z',
    createdAt: '2024-01-20T14:00:00Z',
    createdBy: 'Emily Johnson'
  },
  {
    id: '3',
    invoiceNumber: 'INV-2024-003',
    customerId: '2',
    customerName: 'TechStart Inc',
    customerEmail: 'orders@techstart.io',
    items: [
      {
        id: '3-1',
        productId: '3',
        productName: 'USB-C Hub Adapter',
        productSku: 'SKU-003',
        quantity: 25,
        unitPrice: 49.99,
        taxRate: 8,
        discount: 0,
        total: 1349.73
      },
      {
        id: '3-2',
        productId: '7',
        productName: '4K Webcam',
        productSku: 'SKU-007',
        quantity: 10,
        unitPrice: 179.99,
        taxRate: 8,
        discount: 0,
        total: 1943.89
      }
    ],
    subtotal: 3049.65,
    taxAmount: 243.97,
    discountAmount: 0,
    total: 3293.62,
    status: 'paid',
    paymentMethod: 'credit_card',
    template: 'retail',
    dueDate: '2024-02-05T00:00:00Z',
    createdAt: '2024-01-22T09:15:00Z',
    createdBy: 'John Smith'
  },
  {
    id: '4',
    invoiceNumber: 'INV-2024-004',
    customerId: '6',
    customerName: 'Midwest Manufacturing',
    customerEmail: 'orders@midwestmfg.com',
    items: [
      {
        id: '4-1',
        productId: '8',
        productName: 'Filing Cabinet - 3 Drawer',
        productSku: 'SKU-008',
        quantity: 30,
        unitPrice: 219.99,
        taxRate: 8,
        discount: 15,
        total: 5613.75
      },
      {
        id: '4-2',
        productId: '10',
        productName: 'Monitor Stand with Drawers',
        productSku: 'SKU-010',
        quantity: 50,
        unitPrice: 79.99,
        taxRate: 8,
        discount: 10,
        total: 3887.51
      }
    ],
    subtotal: 10599.20,
    taxAmount: 847.94,
    discountAmount: 1589.88,
    total: 9857.26,
    status: 'paid',
    paymentMethod: 'bank_transfer',
    template: 'bulk',
    notes: 'Priority shipping - large volume order',
    dueDate: '2024-02-10T00:00:00Z',
    createdAt: '2024-01-25T11:45:00Z',
    createdBy: 'Emily Johnson'
  },
  {
    id: '5',
    invoiceNumber: 'INV-2024-005',
    customerId: '5',
    customerName: 'Creative Studios',
    customerEmail: 'office@creativestudios.co',
    items: [
      {
        id: '5-1',
        productId: '6',
        productName: 'Desk Lamp with Wireless Charger',
        productSku: 'SKU-006',
        quantity: 8,
        unitPrice: 69.99,
        taxRate: 8,
        discount: 0,
        total: 604.71
      }
    ],
    subtotal: 559.92,
    taxAmount: 44.79,
    discountAmount: 0,
    total: 604.71,
    status: 'overdue',
    paymentMethod: 'check',
    template: 'retail',
    dueDate: '2024-02-01T00:00:00Z',
    createdAt: '2024-01-18T16:30:00Z',
    createdBy: 'John Smith'
  },
  {
    id: '6',
    invoiceNumber: 'INV-2024-006',
    customerId: '9',
    customerName: 'Retail Giants Co',
    customerEmail: 'vendor@retailgiants.com',
    items: [
      {
        id: '6-1',
        productId: '1',
        productName: 'Wireless Bluetooth Headphones',
        productSku: 'SKU-001',
        quantity: 100,
        unitPrice: 149.99,
        taxRate: 8,
        discount: 20,
        total: 12959.14
      },
      {
        id: '6-2',
        productId: '9',
        productName: 'Wireless Mouse - Ergonomic',
        productSku: 'SKU-009',
        quantity: 150,
        unitPrice: 54.99,
        taxRate: 8,
        discount: 15,
        total: 7556.63
      },
      {
        id: '6-3',
        productId: '11',
        productName: 'Portable External SSD 1TB',
        productSku: 'SKU-011',
        quantity: 75,
        unitPrice: 129.99,
        taxRate: 8,
        discount: 10,
        total: 9476.27
      }
    ],
    subtotal: 32748.25,
    taxAmount: 2619.86,
    discountAmount: 6549.65,
    total: 28818.46,
    status: 'pending',
    paymentMethod: 'bank_transfer',
    template: 'bulk',
    notes: 'Wholesale order - quarterly contract',
    dueDate: '2024-03-15T00:00:00Z',
    createdAt: '2024-02-01T08:00:00Z',
    createdBy: 'Emily Johnson'
  },
  {
    id: '7',
    invoiceNumber: 'INV-2024-007',
    customerId: '4',
    customerName: 'Smith & Associates',
    customerEmail: 'admin@smithassociates.com',
    items: [
      {
        id: '7-1',
        productId: '2',
        productName: 'Ergonomic Office Chair',
        productSku: 'SKU-002',
        quantity: 5,
        unitPrice: 349.99,
        taxRate: 8,
        discount: 0,
        total: 1889.95
      },
      {
        id: '7-2',
        productId: '3',
        productName: 'USB-C Hub Adapter',
        productSku: 'SKU-003',
        quantity: 10,
        unitPrice: 49.99,
        taxRate: 8,
        discount: 0,
        total: 539.89
      }
    ],
    subtotal: 2249.85,
    taxAmount: 179.99,
    discountAmount: 0,
    total: 2429.84,
    status: 'cancelled',
    paymentMethod: 'credit_card',
    template: 'retail',
    notes: 'Order cancelled by customer',
    dueDate: '2024-02-20T00:00:00Z',
    createdAt: '2024-02-05T13:20:00Z',
    createdBy: 'John Smith'
  },
  {
    id: '8',
    invoiceNumber: 'INV-2024-008',
    customerId: '7',
    customerName: 'Healthcare Plus',
    customerEmail: 'supplies@healthcareplus.org',
    items: [
      {
        id: '8-1',
        productId: '7',
        productName: '4K Webcam',
        productSku: 'SKU-007',
        quantity: 20,
        unitPrice: 179.99,
        taxRate: 8,
        discount: 5,
        total: 3693.39
      },
      {
        id: '8-2',
        productId: '12',
        productName: 'Conference Room Speaker',
        productSku: 'SKU-012',
        quantity: 10,
        unitPrice: 249.99,
        taxRate: 8,
        discount: 0,
        total: 2699.89
      }
    ],
    subtotal: 6099.70,
    taxAmount: 487.98,
    discountAmount: 304.99,
    total: 6282.69,
    status: 'pending',
    paymentMethod: 'bank_transfer',
    template: 'bulk',
    dueDate: '2024-03-10T00:00:00Z',
    createdAt: '2024-02-08T10:00:00Z',
    createdBy: 'Emily Johnson'
  },
  {
    id: '9',
    invoiceNumber: 'INV-2024-009',
    customerId: '2',
    customerName: 'TechStart Inc.',
    customerEmail: 'orders@techstart.com',
    items: [
      {
        id: '9-1',
        productId: '1',
        productName: 'Wireless Bluetooth Headphones',
        productSku: 'SKU-001',
        quantity: 5,
        unitPrice: 149.99,
        taxRate: 8,
        discount: 10,
        total: 719.95
      },
      {
        id: '9-2',
        productId: '2',
        productName: 'Ergonomic Office Chair',
        productSku: 'SKU-002',
        quantity: 3,
        unitPrice: 349.99,
        taxRate: 8,
        discount: 0,
        total: 1133.97
      },
      {
        id: '9-3',
        productId: '3',
        productName: 'USB-C Hub Adapter',
        productSku: 'SKU-003',
        quantity: 10,
        unitPrice: 49.99,
        taxRate: 0,
        discount: 0,
        total: 499.90
      },
      {
        id: '9-4',
        productId: '4',
        productName: 'Standing Desk Converter',
        productSku: 'SKU-004',
        quantity: 2,
        unitPrice: 279.99,
        taxRate: 8,
        discount: 5,
        total: 572.78
      },
      {
        id: '9-5',
        productId: '5',
        productName: 'Mechanical Gaming Keyboard',
        productSku: 'SKU-005',
        quantity: 8,
        unitPrice: 139.99,
        taxRate: 8,
        discount: 0,
        total: 1209.51
      },
      {
        id: '9-6',
        productId: '6',
        productName: 'Desk Lamp with Wireless Charger',
        productSku: 'SKU-006',
        quantity: 6,
        unitPrice: 69.99,
        taxRate: 0,
        discount: 0,
        total: 419.94
      },
      {
        id: '9-7',
        productId: '7',
        productName: '4K Webcam',
        productSku: 'SKU-007',
        quantity: 4,
        unitPrice: 179.99,
        taxRate: 8,
        discount: 10,
        total: 691.16
      },
      {
        id: '9-8',
        productId: '9',
        productName: 'Wireless Mouse - Ergonomic',
        productSku: 'SKU-009',
        quantity: 12,
        unitPrice: 54.99,
        taxRate: 8,
        discount: 0,
        total: 713.57
      },
      {
        id: '9-9',
        productId: '10',
        productName: 'Monitor Stand with Drawers',
        productSku: 'SKU-010',
        quantity: 4,
        unitPrice: 79.99,
        taxRate: 0,
        discount: 5,
        total: 303.96
      },
      {
        id: '9-10',
        productId: '11',
        productName: 'Portable External SSD 1TB',
        productSku: 'SKU-011',
        quantity: 7,
        unitPrice: 129.99,
        taxRate: 8,
        discount: 0,
        total: 983.92
      }
    ],
    subtotal: 7248.66,
    taxAmount: 433.54,
    discountAmount: 207.18,
    total: 7474.66,
    status: 'pending',
    paymentMethod: 'bank_transfer',
    template: 'bulk',
    dueDate: '2024-03-25T00:00:00Z',
    createdAt: '2024-02-20T09:15:00Z',
    createdBy: 'Emily Johnson'
  }
]
