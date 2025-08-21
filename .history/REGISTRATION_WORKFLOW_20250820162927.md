# Complete Event Registration System Workflow

## 🔹 Admin Side (Design & Setup)

### Step 1: Event Setup
1. Admin logs in → clicks on **Online Registration**
2. Redirects to `online_registration_manager` page with 4 steps:

### Step 2: Registration Page Design
1. **Design Registration Page**: Admin designs the registration form:
   - Upload background image 
   - Upload logo
   - Add header text and UI elements
   - Customize colors and layout
2. **Save Design**: System saves to `public/event-designs/<event-id>/`:
   - `registration.html` - Complete registration page HTML + CSS
   - `background-registration.jpg/png` - Background image
   - `logo-registration.jpg/png` - Logo image

### Step 3: Confirmation Page Design  
1. **Design Confirmation Page**: Admin designs how the confirmation page looks:
   - Upload background image
   - Upload logo
   - Add confirmation messages
   - Customize layout
2. **Save Design**: System saves to `public/event-designs/<event-id>/`:
   - `confirmation.html` - Complete confirmation page HTML + CSS
   - `background-confirmation.jpg/png` - Background image
   - `logo-confirmation.jpg/png` - Logo image

### Step 4: Email Template Design
1. **Design Email Template**: Admin customizes the confirmation email:
   - Subject line template
   - Header message
   - Greeting content
   - Footer message
   - Color scheme
   - Email layout
2. **Test Email**: Send test emails to verify design
3. **Save Template**: System saves to `public/event-designs/<event-id>/`:
   - `email-template.json` - Email template configuration

### Step 5: Generate Public Link
1. **Generate Link**: Admin generates the public registration URL
2. **Share Link**: `https://domain.com/register/<event-id>`

## 🔹 User Side (Public Registration Flow)

### Step 1: Access Registration
1. User clicks shared registration link: `/register/<event-id>`
2. System loads `public-registration.hbs` with:
   - Saved HTML + CSS from `public/event-designs/<event-id>/registration.html`
   - Background image and logo from event folder
   - Dynamic form fields from event configuration

### Step 2: Fill Registration Form
1. Registration fields are fetched from event schema (same as Admin's "Online Registration" fields)
2. Form displays with custom design applied
3. User fills required information

### Step 3: Submit Registration
1. User clicks **Register** button
2. JavaScript submits form via AJAX to `/event/<event-id>/public-register`
3. System:
   - Validates data
   - Saves registration to database
   - Generates unique registration ID
   - Sends confirmation email (if configured)
   - Redirects to confirmation page

### Step 4: View Confirmation
1. User redirected to: `/event/public-registration/<event-id>/confirmation?reg=<registration-id>`
2. System loads `registration-confirmation.hbs` with:
   - Saved confirmation design from `public/event-designs/<event-id>/confirmation.html`
   - Registration details from database
   - Custom styling and branding

### Step 5: Receive Email Confirmation
1. System sends email using custom template from `email-template.json`
2. Email contains:
   - Custom subject line
   - Personalized greeting
   - Registration details
   - Link to confirmation page
   - Custom branding and colors

## 📁 File Storage Structure

```
public/event-designs/<event-id>/
├── registration.html          # Registration page design
├── confirmation.html          # Confirmation page design  
├── email-template.json        # Email template configuration
├── background-registration.jpg # Registration background
├── background-confirmation.jpg # Confirmation background
├── logo-registration.jpg      # Registration logo
└── logo-confirmation.jpg      # Confirmation logo
```

## 🔧 Technical Implementation

### Routes Added:
- `GET /event/online-registration/:id/design-email` - Email template designer
- `POST /event/online-registration/:id/save-email-template` - Save email template
- `GET /event/online-registration/:id/get-email-template` - Load email template
- `POST /event/online-registration/:id/send-test-email` - Send test email

### Database Schema Updates:
- Added `emailTemplate` object to Event model with:
  - `emailSubject`, `emailHeader`, `emailGreeting`, `emailFooter`
  - `primaryColor`, `backgroundColor`, `htmlTemplate`

### Email Configuration:
- Environment variables: `EMAIL_USER` and `EMAIL_PASS`
- Supports Gmail, Outlook, and custom SMTP
- Template variables: `{{fullName}}`, `{{eventName}}`, `{{registrationId}}`, etc.

## 🚀 Key Features

✅ **Event-specific Design Storage**: Each event has its own design folder
✅ **Complete Admin Workflow**: 4-step process from design to link generation
✅ **Custom Email Templates**: Admin can design and test emails
✅ **Dynamic Content Loading**: Public pages load saved designs automatically
✅ **Responsive Design**: Works on desktop and mobile
✅ **Template Variables**: Dynamic content in emails and pages
✅ **File-based Storage**: Designs persist in files for reliability
✅ **Database Integration**: Registration data saved and displayed
✅ **Authentication Control**: Public routes bypass authentication
✅ **Error Handling**: Graceful fallbacks for missing designs

## 📧 Email Setup Instructions

1. **For Gmail**:
   - Enable 2-factor authentication
   - Generate App Password (16 characters)
   - Update `.env` file with your email and app password

2. **For Other Services**:
   - Update email service configuration in `routes/event.js`
   - Set appropriate SMTP settings

3. **Test Email Functionality**:
   - Use the "Send Test Email" feature in the email designer
   - Verify emails are delivered correctly

This system provides a complete end-to-end solution for event registration with full customization capabilities for both visual design and email communications.
