# Payal Biryani Restaurant Website Specification

## 1. Project Overview
- **Project Name**: Payal Biryani - Bhubaneswar
- **Type**: Single-page responsive restaurant website
- **Core Functionality**: Showcase restaurant information, menu, contact details, and location with online ordering capability
- **Target Users**: Local customers, students, working professionals, and families in Bhubaneswar

## 2. UI/UX Specification

### Layout Structure
- **Header**: Fixed navigation with logo, menu links, and order now button
- **Hero Section**: Full-width banner with restaurant name, tagline, and CTA buttons
- **About Us**: Restaurant story and highlights
- **Menu Section**: Split into Veg and Non-Veg categories with dish cards
- **Contact Section**: Contact form and restaurant details
- **Location Section**: Google Map embed
- **Footer**: Social links, copyright, quick links

### Responsive Breakpoints
- Mobile: < 768px (single column, hamburger menu)
- Tablet: 768px - 1024px (2 columns)
- Desktop: > 1024px (full layout)

### Visual Design

#### Color Palette
- **Primary Red**: #D32F2F (deep red - appetite stimulating)
- **Primary Yellow**: #FFC107 (warm golden yellow)
- **Accent Orange**: #FF6D00 (vibrant accent)
- **Dark Background**: #1A1A1A
- **Light Background**: #FFF8E1 (warm cream)
- **Text Dark**: #212121
- **Text Light**: #FFFFFF
- **Card Background**: #FFFFFF

#### Typography
- **Headings**: 'Playfair Display', serif (elegant, traditional)
- **Body**: 'Poppins', sans-serif (modern, readable)
- **Logo/Brand**: 'Playfair Display', serif
- **Font Sizes**:
  - H1: 3.5rem (hero)
  - H2: 2.5rem (section titles)
  - H3: 1.5rem (dish names)
  - Body: 1rem
  - Small: 0.875rem

#### Spacing System
- Section padding: 80px vertical
- Container max-width: 1200px
- Card gap: 24px
- Element spacing: 16px

#### Visual Effects
- Subtle box shadows on cards
- Hover scale transform on menu items (1.03)
- Smooth scroll behavior
- Fade-in animations on scroll
- Gradient overlays on hero section

### Components

#### Header
- Logo with restaurant name
- Navigation links (Home, About, Menu, Contact)
- "Order Now" button (red background, yellow text)
- Sticky on scroll with background blur

#### Hero Section
- Background image with dark overlay
- Large headline: "Payal Biryani"
- Tagline: "Authentic Flavors, Unforgettable Taste"
- Two CTA buttons: "Order Now" (red), "View Menu" (yellow outline)
- Decorative spice/biryani imagery elements

#### About Section
- Two-column layout (image + text)
- Restaurant history and highlights
- Key selling points with icons:
  - Fresh Ingredients
  - Traditional Recipes
  - Pocket-Friendly
  - Quality & Hygiene

#### Menu Section
- Tab system for Veg/Non-Veg toggle
- Category headers
- Menu item cards containing:
  - Dish image
  - Dish name
  - Description
  - Price badge

**Veg Menu Items:**
1. Veg Biryani - ₹180
2. Paneer Biryani - ₹200
3. Mushroom Biryani - ₹190
4. Veg Fried Rice - ₹150
5. Paneer Tikka - ₹220
6. Veg Manchurian - ₹160

**Non-Veg Menu Items:**
1. Chicken Biryani - ₹220
2. Mutton Biryani - ₹320
3. Egg Biryani - ₹190
4. Chicken 65 - ₹180
5. Chicken Lollipop - ₹200
6. Fish Fry - ₹250

#### Contact Section
- Contact form (Name, Phone, Message)
- Restaurant phone number
- Operating hours
- Address details

#### Location Section
- Google Maps embed (Bhubaneswar location)
- Address text
- Directions button

#### Footer
- Restaurant logo and brief description
- Quick links
- Social media icons
- Copyright text

## 3. Functionality Specification

### Core Features
1. Smooth scrolling navigation
2. Mobile hamburger menu toggle
3. Menu category filter (Veg/Non-Veg tabs)
4. Contact form with validation
5. Responsive image loading
6. Scroll-triggered animations
7. "Order Now" button opens contact/whatsapp

### User Interactions
- Click navigation → smooth scroll to section
- Click menu tabs → filter displayed items
- Hover menu cards → subtle lift effect
- Click "Order Now" → scroll to contact or open WhatsApp
- Form submission → show success message

### Data Handling
- Static menu data (no backend)
- Form validation (required fields, phone format)
- No persistent storage needed

## 4. Acceptance Criteria

### Visual Checkpoints
- [ ] Header is sticky and shows hamburger on mobile
- [ ] Hero section has proper overlay and readable text
- [ ] About section displays in two columns on desktop
- [ ] Menu tabs switch between Veg and Non-Veg items
- [ ] Menu cards have hover effects
- [ ] Contact form validates inputs
- [ ] Google Map displays correctly
- [ ] Footer is properly styled
- [ ] All colors match the red/yellow theme
- [ ] Typography is consistent throughout

### Functional Checkpoints
- [ ] All navigation links work
- [ ] Mobile menu toggles correctly
- [ ] Menu filter tabs work
- [ ] Smooth scroll works
- [ ] Form validation works
- [ ] Responsive on all breakpoints

## 5. Technical Implementation
- Single HTML file with embedded CSS and JavaScript
- External fonts from Google Fonts
- Placeholder images from Unsplash/Pexels
- No framework dependencies
- Google Maps embed iframe
