import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronRight,
  Code,
  Settings,
  Terminal,
  User,
  Wand2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../supabase/auth";

export default function LandingPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Apple-style navigation */}
      <header className="fixed top-0 z-50 w-full bg-[rgba(255,255,255,0.8)] backdrop-blur-md border-b border-[#f5f5f7]/30">
        <div className="max-w-[980px] mx-auto flex h-12 items-center justify-between px-4">
          <div className="flex items-center">
            <Link to="/" className="font-medium text-xl">
              React App Builder
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center gap-4">
                <Link to="/dashboard">
                  <Button
                    variant="ghost"
                    className="text-sm font-light hover:text-gray-500"
                  >
                    Dashboard
                  </Button>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Avatar className="h-8 w-8 hover:cursor-pointer">
                      <AvatarImage
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`}
                        alt={user.email || ""}
                      />
                      <AvatarFallback>
                        {user.email?.[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="rounded-xl border-none shadow-lg"
                  >
                    <DropdownMenuLabel className="text-xs text-gray-500">
                      {user.email}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onSelect={() => signOut()}
                    >
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <>
                <Link to="/login">
                  <Button
                    variant="ghost"
                    className="text-sm font-light hover:text-gray-500"
                  >
                    Sign In
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button className="rounded-full bg-black text-white hover:bg-gray-800 text-sm px-4">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="pt-12">
        {/* Hero section */}
        <section className="py-20 text-center">
          <h2 className="text-5xl font-semibold tracking-tight mb-1">
            AI-Powered Web App Generator
          </h2>
          <h3 className="text-2xl font-medium text-gray-500 mb-4">
            Build React applications from text prompts in seconds
          </h3>
          <div className="flex justify-center space-x-6 text-xl text-blue-600">
            <Link to="/dashboard" className="flex items-center hover:underline">
              Try it now <ChevronRight className="h-4 w-4" />
            </Link>
            <Link to="/signup" className="flex items-center hover:underline">
              Get started <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {/* App preview mockup */}
          <div className="mt-10 max-w-4xl mx-auto bg-gray-100 rounded-xl p-6 shadow-md">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium">Prompt Input</h4>
                  <Wand2 className="h-4 w-4 text-purple-500" />
                </div>
                <div className="bg-gray-50 rounded-md p-3 text-sm text-gray-700 min-h-[120px]">
                  Create a todo app with a clean interface, dark mode toggle,
                  and the ability to categorize tasks by priority. Include a
                  date picker for due dates.
                </div>
                <Button className="mt-3 w-full bg-purple-600 hover:bg-purple-700">
                  Generate App
                </Button>
              </div>

              <div className="flex-1 bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium">Live Preview</h4>
                  <div className="flex gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-500"></div>
                    <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                    <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  </div>
                </div>
                <div className="bg-gray-800 rounded-md p-3 min-h-[120px] flex flex-col">
                  <div className="flex justify-between items-center mb-2">
                    <h5 className="text-white text-sm font-medium">My Tasks</h5>
                    <div className="h-4 w-8 bg-gray-600 rounded-full"></div>
                  </div>
                  <div className="bg-gray-700 rounded p-2 mb-2">
                    <div className="flex items-center">
                      <div className="h-3 w-3 rounded-sm border border-green-400 mr-2"></div>
                      <span className="text-white text-xs">
                        Complete project
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-700 rounded p-2">
                    <div className="flex items-center">
                      <div className="h-3 w-3 rounded-sm border border-red-400 mr-2"></div>
                      <span className="text-white text-xs">Review code</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features section */}
        <section className="py-20 bg-[#f5f5f7] text-center">
          <h2 className="text-5xl font-semibold tracking-tight mb-1">
            How It Works
          </h2>
          <h3 className="text-2xl font-medium text-gray-500 mb-4">
            From text to functional React app in minutes
          </h3>

          <div className="mt-8 max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-2xl shadow-sm text-left">
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Wand2 className="h-6 w-6 text-blue-600" />
              </div>
              <h4 className="text-xl font-medium mb-2">Describe Your App</h4>
              <p className="text-gray-500">
                Enter a detailed description of the app you want to build using
                natural language.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm text-left">
              <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <Code className="h-6 w-6 text-purple-600" />
              </div>
              <h4 className="text-xl font-medium mb-2">AI Generates Code</h4>
              <p className="text-gray-500">
                Our AI analyzes your description and generates React components
                and structure.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm text-left">
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Terminal className="h-6 w-6 text-green-600" />
              </div>
              <h4 className="text-xl font-medium mb-2">Customize & Export</h4>
              <p className="text-gray-500">
                Edit the generated code in our live editor and export your
                complete project.
              </p>
            </div>
          </div>
        </section>

        {/* Grid section for other features */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3">
          <div className="bg-[#f5f5f7] rounded-3xl p-12 text-center">
            <h2 className="text-4xl font-semibold tracking-tight mb-1">
              Live Preview
            </h2>
            <h3 className="text-xl font-medium text-gray-500 mb-4">
              See your app as you build it
            </h3>
            <div className="flex justify-center space-x-6 text-lg text-blue-600">
              <Link to="/" className="flex items-center hover:underline">
                Learn more <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-4 bg-white p-6 rounded-xl shadow-sm max-w-sm mx-auto">
              <div className="bg-gray-100 rounded-md h-40 flex items-center justify-center">
                <div className="text-gray-400 text-sm">
                  Live preview renders here
                </div>
              </div>
              <div className="mt-4 h-8 bg-gray-100 rounded-md w-full"></div>
              <div className="mt-2 h-8 bg-gray-100 rounded-md w-3/4 mx-auto"></div>
            </div>
          </div>
          <div className="bg-[#f5f5f7] rounded-3xl p-12 text-center">
            <h2 className="text-4xl font-semibold tracking-tight mb-1">
              Code Editor
            </h2>
            <h3 className="text-xl font-medium text-gray-500 mb-4">
              Modify generated code
            </h3>
            <div className="flex justify-center space-x-6 text-lg text-blue-600">
              <Link to="/" className="flex items-center hover:underline">
                View features <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-4 bg-gray-900 p-6 rounded-xl shadow-sm max-w-sm mx-auto text-left">
              <pre className="text-green-400 text-xs font-mono overflow-x-auto">
                <code>
                  {`function App() {
  const [tasks, setTasks] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  
  return (
    <div className={darkMode ? "dark" : ""}>
      <TaskList tasks={tasks} />
      <AddTaskForm onAdd={setTasks} />
    </div>
  );
}`}
                </code>
              </pre>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#f5f5f7] py-12 text-xs text-gray-500">
        <div className="max-w-[980px] mx-auto px-4">
          <div className="border-b border-gray-300 pb-8 grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h4 className="font-medium text-sm text-gray-900 mb-4">
                React App Builder
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/" className="hover:underline">
                    Features
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:underline">
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:underline">
                    Components
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:underline">
                    Examples
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-sm text-gray-900 mb-4">
                Resources
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/" className="hover:underline">
                    Getting Started
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:underline">
                    API Reference
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:underline">
                    Tutorials
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:underline">
                    Blog
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-sm text-gray-900 mb-4">
                Community
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/" className="hover:underline">
                    GitHub
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:underline">
                    Discord
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:underline">
                    Twitter
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:underline">
                    YouTube
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-sm text-gray-900 mb-4">Legal</h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/" className="hover:underline">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:underline">
                    Terms
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:underline">
                    Cookie Policy
                  </Link>
                </li>
                <li>
                  <Link to="/" className="hover:underline">
                    Licenses
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="py-4">
            <p>Copyright © 2025 React App Builder. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
