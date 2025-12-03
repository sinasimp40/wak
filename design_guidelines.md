# RDP Management Dashboard Design Guidelines

## Design Approach
**System Selected**: Modern Dashboard Pattern (inspired by Linear, Vercel Dashboard, and Railway)
- Clean, data-focused interface prioritizing information hierarchy and task completion
- Emphasis on status visibility, quick actions, and efficient workflows
- Professional aesthetic suitable for technical/administrative users

## Typography System

**Font Family**: 
- Primary: Inter (Google Fonts) for UI elements, data tables, and body text
- Monospace: JetBrains Mono for IPs, IDs, and technical data

**Hierarchy**:
- Page Titles: text-3xl font-semibold
- Section Headers: text-xl font-semibold
- Card Titles: text-lg font-medium
- Body Text: text-base font-normal
- Labels/Meta: text-sm font-medium
- Small Data: text-xs font-normal
- Monospace Data (IPs, IDs): text-sm font-mono

## Layout System

**Spacing Primitives**: Use Tailwind units of 2, 4, 6, and 8 for consistency
- Component padding: p-4 to p-6
- Section gaps: gap-6 to gap-8
- Card spacing: space-y-4
- Grid gaps: gap-4 to gap-6
- Page margins: px-6 py-8

**Container Strategy**:
- Max width: max-w-7xl mx-auto for main content
- Sidebar: Fixed width w-64 on desktop
- Dashboard cards: Grid layout (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)

## Component Library

### Navigation & Layout
**Sidebar Navigation** (Desktop):
- Fixed left sidebar with logo, navigation links, and account info at bottom
- Icon + label pattern for menu items
- Active state with background indicator
- Collapsible sections for organization

**Mobile Navigation**:
- Hamburger menu triggering slide-out drawer
- Full-screen overlay pattern

**Top Bar**:
- Account balance display (prominent)
- User menu dropdown (top-right)
- Breadcrumbs for nested views

### Dashboard Components
**Stat Cards** (3-column grid on desktop):
- Large number display for key metrics (balance, active VPS, total orders)
- Label beneath number
- Subtle icon in corner
- Border with subtle shadow

**VPS List Table**:
- Striped rows for readability
- Columns: VPS ID, IP Address, Status, Location, OS, Tariff, Expiration, Actions
- Status badges with distinct visual states (Running, Starting, Cloning)
- Action dropdown menu per row
- Sticky header on scroll
- Responsive: Stack into cards on mobile

**Order Cards** (Alternative view):
- Card-based layout showing order summary
- Expandable section revealing VPS list
- Quick actions toolbar
- Expiration countdown badge

### Forms & Inputs
**Create VPS Form**:
- Multi-step or single-page form with clear sections
- Tariff selection: Radio card pattern showing specs and pricing
- Location selector: Toggle or segmented control (Moscow/Amsterdam)
- OS dropdown with icons
- Period input with slider showing price calculation
- Additional options: Checkbox cards with descriptions
- Summary panel showing total cost
- Prominent "Create VPS" button

**Input Fields**:
- Labels above inputs
- Helper text below inputs
- Error states with inline messages
- Disabled states clearly distinguished

### Interactive Elements
**Buttons**:
- Primary: Solid fill for main actions
- Secondary: Outline style for secondary actions
- Danger: For destructive actions (reinstall, delete)
- Ghost: For tertiary actions
- Icon buttons: Square with icon only
- All buttons: rounded-lg, px-4 py-2, font-medium

**Status Badges**:
- Pill-shaped (rounded-full)
- Small size (text-xs px-2 py-1)
- States: Running, Stopped, Starting, Cloning, Error
- Icon + text combination

**Dropdowns & Menus**:
- Action menus: Floating panel with list items
- Options: Reboot, Reinstall OS, Change Tariff, Extend, Clone
- Icons preceding labels
- Dividers separating dangerous actions

### Data Display
**Pricing Tables**:
- Comparison grid showing tariff tiers
- Highlighted recommended option
- Clear pricing breakdown by period
- Discount badges where applicable

**Information Panels**:
- Key-value pairs for VPS details
- Connection information display (IP, credentials)
- Copyable fields with click-to-copy icons
- Organized in dl/dt/dd semantic structure

**Empty States**:
- Centered content with illustration or icon
- Helpful message explaining next steps
- Primary CTA to create first VPS

## Animations
**Minimal Motion Approach**:
- Smooth transitions for dropdowns/modals (duration-200)
- Subtle hover states on interactive elements
- Loading spinners for async operations
- No page transitions or elaborate animations
- Focus on performance and clarity

## Images
**No Hero Images Required** - This is a utility dashboard
**Icon Usage**: Heroicons via CDN for all interface icons
- Status indicators
- Navigation menu items
- Action buttons
- Empty state illustrations

## Dashboard-Specific Patterns
**Real-time Updates**:
- Auto-refresh indicator for VPS status
- Polling interval display
- Manual refresh button

**Multi-Action Workflows**:
- Bulk selection for VPS operations
- Confirmation modals for destructive actions
- Progress indicators for long operations (cloning, creating)

**Responsive Behavior**:
- Desktop: Sidebar + content area
- Tablet: Collapsed sidebar, full-width content
- Mobile: Bottom navigation or hamburger menu, stacked cards

## Accessibility
- Semantic HTML for all components
- ARIA labels for icon-only buttons
- Keyboard navigation support throughout
- Focus indicators on all interactive elements
- Screen reader announcements for status changes
- Sufficient contrast ratios for text and UI elements