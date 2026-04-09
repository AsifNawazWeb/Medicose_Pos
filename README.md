# 🏥 Medical POS System - Professional Edition v2.0
## (Angular + Node.js + SQLite + Electron)

> **New in v2.0:** Complete UI/UX redesign with professional medical theme, enhanced user experience, and modern design system. See [UI/UX_ENHANCEMENTS.md](./UI_UX_ENHANCEMENTS.md) for full details.

---

## ✨ What's New in v2.0

- 🎨 **Professional Design System** - Medical-themed color palette with teal and blue
- 🚀 **Enhanced UX** - Smooth animations, better interactions, improved workflow
- 📱 **Responsive Design** - Optimized for all devices with 4 breakpoints
- ♿ **WCAG 2.1 AA** - Full accessibility compliance
- 🎯 **Better Visual Hierarchy** - Clear, professional interface
- 🌓 **Improved Dark Mode** - Better contrast and readability
- ⚡ **Performance** - Optimized animations and rendering

---

## 🚀 Quick Start

```bash
npm install              # Install dependencies (once)
npm run init-db         # Create database (once)
npm run dev             # Start application (Angular + API + Electron)
```

Alternative commands:
```bash
npm run server          # Server only
npm start               # Electron only (starts API automatically)
npm run build-win       # Build Windows .exe
```

---

## 🔐 Default Login
- **Email:** `test@store.com`
- **Password:** `TestPass123`

⚠️ **Important:** Change the password from **Settings → Security** after first login.

---

## 📋 Features

### Core Functionality
- ✅ Point of Sale (POS) with barcode scanning
- ✅ Inventory management
- ✅ Sales tracking and history
- ✅ Customer management
- ✅ Supplier management
- ✅ Purchase order management
- ✅ Returns processing
- ✅ Comprehensive reporting
- ✅ Thermal receipt printing
- ✅ WhatsApp integration
- ✅ User authentication & security
- ✅ Automatic database backups

### New UI/UX Features
- ✨ Professional medical theme
- ✨ Color-coded status indicators
- ✨ Animated statistics cards
- ✨ Enhanced data visualization
- ✨ Smooth page transitions
- ✨ Improved form validation
- ✨ Better empty states
- ✨ Professional typography

---

## 💻 Technology Stack

### Frontend
- **Angular 17** - Modern framework
- **Material Design** - Professional UI components
- **Chart.js** - Data visualization
- **SCSS** - Advanced styling with design system
- **TypeScript** - Type-safe development

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **SQLite** (better-sqlite3) - Embedded database
- **JWT** - Secure authentication
- **bcrypt** - Password hashing

### Desktop
- **Electron** - Cross-platform desktop app
- **Secure preload** - Context isolation enabled

---

## 📝 Notes

### Database
- **Location:** `data/medical_pos.sqlite`
- **Backups:** Automatic daily at 11:00 PM to `backups/`
- **Migration:** No changes needed from v1 to v2

### Hardware
- **Barcode Scanner:** Works as keyboard input (USB scanner types barcode)
- **Thermal Printer:** Uses Windows installed printer via Electron
- **Silent Printing:** Supported for fast checkout

### Design System
- **Colors:** CSS custom properties for easy theming
- **Spacing:** 6-level scale (4px to 48px)
- **Typography:** Inter font with 5 weights
- **Shadows:** 4 elevation levels
- See [UI/UX_ENHANCEMENTS.md](./UI_UX_ENHANCEMENTS.md) for customization

---

## 🔄 Upgrading from v1

1. Backup your database (`data/medical_pos.sqlite`)
2. Replace files with v2
3. Keep your database file
4. Run `npm install` (if dependencies changed)
5. Start the app - everything works!

**No migration needed** - v2 is fully backward compatible!

---

## 📚 Documentation

- [UI/UX Enhancements](./UI_UX_ENHANCEMENTS.md) - Complete design documentation
- [Changelog](./CHANGELOG_UI_UX.md) - Detailed list of improvements
- Code comments throughout the project

---

## 📄 License

MIT License - Free to use and modify

---

**Version:** 2.0.0 Professional Edition  
**Status:** ✅ Production Ready  
**Last Updated:** February 2026
