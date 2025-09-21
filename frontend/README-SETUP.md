# AliBot - AI-Powered Assistant

A modern Next.js application with Supabase authentication featuring GitHub OAuth login.

## Features

- 🚀 **Next.js 15** with App Router
- 🔐 **Supabase Authentication** with GitHub OAuth
- 🎨 **Tailwind CSS** for styling
- 🌙 **Dark/Light Mode** support
- 📱 **Responsive Design**
- ✨ **Beautiful animations** and transitions

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
cd frontend
npm install
```

### 2. Supabase Setup

1. Go to [Supabase](https://supabase.com) and create a new project
2. In your Supabase dashboard, go to **Settings > API**
3. Copy your project URL and anon key
4. Update the `.env.local` file with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 3. GitHub OAuth Setup

1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Click "New OAuth App"
3. Fill in the details:
   - **Application name**: AliBot
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `https://your-project-ref.supabase.co/auth/v1/callback`
4. After creating the app, copy the Client ID and Client Secret

### 4. Configure GitHub OAuth in Supabase

1. In your Supabase dashboard, go to **Authentication > Providers**
2. Find GitHub and toggle it on
3. Enter your GitHub Client ID and Client Secret
4. Set the redirect URL to: `https://your-project-ref.supabase.co/auth/v1/callback`

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
frontend/
├── app/
│   ├── dashboard/          # Protected dashboard page
│   ├── login/             # Login page with GitHub OAuth
│   ├── globals.css        # Global styles and animations
│   ├── layout.tsx         # Root layout with AuthProvider
│   └── page.tsx           # Landing page
├── components/
│   └── ui/                # Reusable UI components
├── lib/
│   ├── auth-context.tsx   # Authentication context and hooks
│   ├── supabase.ts        # Supabase client configuration
│   └── utils.ts           # Utility functions
└── .env.local             # Environment variables
```

## Authentication Flow

1. **Landing Page** (`/`) - Hero section with call-to-action
2. **Login Page** (`/login`) - GitHub OAuth authentication
3. **Dashboard** (`/dashboard`) - Protected area for authenticated users

The app automatically redirects:
- Authenticated users from `/` and `/login` to `/dashboard`
- Unauthenticated users from `/dashboard` to `/login`

## Environment Variables

Create a `.env.local` file in the frontend directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Update the GitHub OAuth callback URL to your production domain
4. Update the Supabase redirect URL settings

### Other Platforms

Make sure to:
1. Set the environment variables
2. Update OAuth callback URLs
3. Update Supabase redirect URLs

## Troubleshooting

### Common Issues

1. **"Invalid login credentials"**
   - Check your Supabase URL and anon key
   - Verify GitHub OAuth configuration

2. **Redirect loops**
   - Ensure callback URLs match exactly
   - Check environment variables

3. **Authentication not working**
   - Verify GitHub OAuth app settings
   - Check browser network tab for errors

### Support

For issues related to:
- **Supabase**: Check the [Supabase Documentation](https://supabase.com/docs)
- **Next.js**: Check the [Next.js Documentation](https://nextjs.org/docs)
- **GitHub OAuth**: Check the [GitHub OAuth Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)

## License

MIT License - see LICENSE file for details.
