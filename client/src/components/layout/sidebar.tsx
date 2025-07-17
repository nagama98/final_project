import { 
  BarChart3, 
  FileText, 
  Users, 
  FolderOpen, 
  Settings, 
  Shield,
  Plus
} from "lucide-react";
import { useLocation } from "wouter";

export default function Sidebar() {
  const [location] = useLocation();

  const menuItems = [
    {
      title: "Main Menu",
      items: [
        { name: "Dashboard", icon: BarChart3, href: "/dashboard" },
        { name: "Applications", icon: FileText, href: "/applications" },
        { name: "New Application", icon: Plus, href: "/applications/new" },
        { name: "Customers", icon: Users, href: "/customers" },
        { name: "Documents", icon: FolderOpen, href: "/documents" },
      ]
    },
    {
      title: "Settings",
      items: [
        { name: "Configuration", icon: Settings, href: "/settings" },
        { name: "Security", icon: Shield, href: "/security" },
      ]
    }
  ];

  return (
    <aside className="w-64 bg-white shadow-lg h-screen sticky top-0">
      <div className="p-6">
        {menuItems.map((section) => (
          <div key={section.title} className="mb-8">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              {section.title}
            </h3>
            <nav className="space-y-2">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href || (location === "/" && item.href === "/dashboard");
                
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
                      isActive
                        ? "text-primary bg-blue-50"
                        : "text-gray-600 hover:text-primary hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="mr-3 h-4 w-4" />
                    {item.name}
                  </a>
                );
              })}
            </nav>
          </div>
        ))}
      </div>
    </aside>
  );
}
