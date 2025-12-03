const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    // 🆕 Separate prices
    customerPrice: { type: Number, required: true },
    dealerPrice: { type: Number, required: true },

    imageUrl: { type: String },
    description: { type: String },
    sku: { type: String },
    category: { type: String },
    stockQty: { type: Number, default: 0 },

    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
