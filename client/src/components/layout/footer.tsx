import { Link } from "wouter";
import { Github, Twitter, Linkedin, Mail } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">iMageWiz</h3>
            <p className="text-sm text-gray-600">
              Advanced AI-powered background removal for professionals and creators.
            </p>
            <div className="flex space-x-4">
              <a href="https://github.com" className="text-gray-600 hover:text-primary">
                <Github className="h-5 w-5" />
              </a>
              <a href="https://twitter.com" className="text-gray-600 hover:text-primary">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="https://linkedin.com" className="text-gray-600 hover:text-primary">
                <Linkedin className="h-5 w-5" />
              </a>
              <a href="mailto:contact@imagewiz.com" className="text-gray-600 hover:text-primary">
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Product</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/pricing">
                  <a className="text-gray-600 hover:text-primary">Pricing</a>
                </Link>
              </li>
              <li>
                <Link href="/dashboard">
                  <a className="text-gray-600 hover:text-primary">Dashboard</a>
                </Link>
              </li>
              <li>
                <a href="#api" className="text-gray-600 hover:text-primary">API</a>
              </li>
              <li>
                <a href="#batch" className="text-gray-600 hover:text-primary">Batch Processing</a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Resources</h3>
            <ul className="space-y-2">
              <li>
                <a href="#docs" className="text-gray-600 hover:text-primary">Documentation</a>
              </li>
              <li>
                <a href="#guides" className="text-gray-600 hover:text-primary">Guides</a>
              </li>
              <li>
                <a href="#blog" className="text-gray-600 hover:text-primary">Blog</a>
              </li>
              <li>
                <a href="#support" className="text-gray-600 hover:text-primary">Support</a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <a href="#privacy" className="text-gray-600 hover:text-primary">Privacy Policy</a>
              </li>
              <li>
                <a href="#terms" className="text-gray-600 hover:text-primary">Terms of Service</a>
              </li>
              <li>
                <a href="#gdpr" className="text-gray-600 hover:text-primary">GDPR</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-center text-gray-600 text-sm">
            © {new Date().getFullYear()} iMageWiz. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
