# GlyphMart

A React website for sharing custom Nothing Phone(3) glyphs, built with Vite and styled with Nothing's design language.

## Features

- 🔐 **User Authentication** - Email/password signup and login with Firebase
- 👤 **User Profiles** - Customizable storefronts for each user
- 📱 **Glyph Sharing** - Upload and share custom Nothing Phone(3) glyphs
- 🔍 **Search & Discovery** - Find glyphs by title, creator, or popularity
- 📊 **Analytics** - Track downloads, views, and likes
- 🎨 **Nothing Design Language** - Clean, minimalist interface inspired by Nothing's aesthetic
- 📱 **Mobile Responsive** - Works seamlessly on all devices

## Tech Stack

- **Frontend**: React 19, Vite 7
- **Styling**: Tailwind CSS with Nothing-inspired custom colors
- **Backend**: Firebase (Firestore, Authentication, Storage)
- **Router**: React Router v6
- **Icons**: Lucide React
- **Animations**: Framer Motion

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Firebase project with Firestore and Authentication enabled

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/glyphmart.git
   cd glyphmart/Website
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Firebase:
   - Create a Firebase project at https://console.firebase.google.com
   - Enable Authentication with Email/Password
   - Create a Firestore database
   - Enable Storage for file uploads
   - Get your Firebase config and update `src/utils/firebase.js`

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open http://localhost:5173 in your browser

## Firebase Configuration

Update `src/utils/firebase.js` with your Firebase project configuration:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

## Firestore Database Structure

The app uses the following Firestore collections:

### Users Collection (`users`)
```javascript
{
  uid: "user-id",
  email: "user@example.com",
  username: "unique_username",
  displayName: "Display Name",
  createdAt: timestamp,
  glyphsCount: 0,
  bio: "User bio",
  website: "https://website.com",
  location: "City, Country"
}
```

### Glyphs Collection (`glyphs`)
```javascript
{
  title: "Glyph Title",
  description: "Glyph description",
  creatorId: "user-id",
  creatorUsername: "username",
  images: ["image-url-1", "image-url-2"],
  apkUrl: "download-url",
  githubUrl: "github-repo-url",
  instructions: "Installation instructions",
  downloads: 0,
  views: 0,
  likes: 0,
  createdAt: timestamp
}
```

### Likes Collection (`likes`)
```javascript
{
  userId: "user-id",
  glyphId: "glyph-id",
  createdAt: timestamp
}
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   └── Navbar.jsx      # Navigation component
├── contexts/           # React contexts
│   └── AuthContext.jsx # Authentication context
├── pages/              # Page components
│   ├── Home.jsx        # Homepage with latest/popular glyphs
│   ├── Login.jsx       # Login page
│   ├── SignUp.jsx      # Registration page
│   ├── GlyphDetail.jsx # Individual glyph page
│   └── Storefront.jsx  # User profile/storefront
├── utils/              # Utility functions
│   └── firebase.js     # Firebase configuration
├── App.jsx             # Main app component with routing
├── index.css           # Global styles with Tailwind
└── main.jsx            # App entry point
```

## Nothing Design Language

The app follows Nothing's design principles:

- **Colors**: Black (`#000000`), White (`#FFFFFF`), Red (`#FF0000`), and various gray shades
- **Typography**: Inter font family
- **Minimalism**: Clean, uncluttered interfaces
- **Glyphs**: Red circular elements with white centers as visual accents
- **Animations**: Subtle hover effects and loading animations

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Adding New Features

To add new features:

1. Create components in `src/components/`
2. Add pages in `src/pages/`
3. Update routing in `src/App.jsx`
4. Add Firebase functions as needed

## Mobile App Compatibility

The website is designed to work alongside a mobile app that uses the same Firebase database. Both platforms share:

- User accounts and authentication
- Glyph data and metadata
- User storefronts and profiles
- Analytics and engagement data

## Security & Disclaimers

The app includes safety disclaimers for APK downloads, warning users that:
- GlyphMart doesn't guarantee the safety of third-party files
- Users download and install APKs at their own risk
- Community-generated content should be verified before use

## TODO: Still to implement

- User settings/profile editing page
- Better search functionality (consider Algolia for production)
- Image upload optimization
- Push notifications
- Admin panel

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue on GitHub or contact the development team.

---

**Note**: This project is not affiliated with Nothing Technology Limited. It's a community project inspired by Nothing's design language.+ Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
