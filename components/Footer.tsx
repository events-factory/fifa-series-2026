export default function Footer() {
  return (
    <footer className="bg-primary-700 border-t border-white/10 mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-white/50">
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Use</a>
          </div>
          <div>© {new Date().getFullYear()} FIFA Series. All rights reserved.</div>
        </div>
      </div>
    </footer>
  );
}
