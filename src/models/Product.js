const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    imageUrl: { type: String },
    description: { type: String },
    sku: { type: String },
    category: { type: String },

    stockQty: { type: Number, default: 0 },

    // ⭐ IMPORTANT → This field was missing
    alertLevel: {
      type: String,
      enum: ["CRITICAL", "LOW", "WARNING", "NONE"],
      default: "NONE",
    },

    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' }
  },
  { timestamps: true }
);

/* ======================================================
   ⭐ Automatically set alertLevel when product is saved
====================================================== */
productSchema.pre("save", function (next) {
  const qty = this.stockQty;

  if (qty < 5) this.alertLevel = "CRITICAL";
  else if (qty < 20) this.alertLevel = "LOW";
  else if (qty < 50) this.alertLevel = "WARNING";
  else this.alertLevel = "NONE";

  next();
});

/* ======================================================
   ⭐ Automatically update alert level on updates too
====================================================== */
productSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();

  if (update.stockQty !== undefined) {
    const qty = update.stockQty;

    update.alertLevel =
      qty < 5
        ? "CRITICAL"
        : qty < 20
        ? "LOW"
        : qty < 50
        ? "WARNING"
        : "NONE";
  }

  next();
});

module.exports = mongoose.model('Product', productSchema);
