export function Footer() {
  return (
    <footer className="w-full bg-white mt-auto">
      <div className="w-full max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-slate-400">
          &copy; {new Date().getFullYear()} MetaCall Inc. All rights reserved.
        </p>
        <div className="flex items-center gap-6">
          <a
            className="text-[11px] font-semibold tracking-widest text-gray-600 hover:text-blue-500 hover:underline transition-colors"
            href="https://metacall.io/docs"
          >
            Documentation
          </a>
          <a
            className="text-[11px] font-semibold tracking-widest text-gray-600 hover:text-blue-500 hover:underline transition-colors"
            href="https://metacall.io/community"
          >
            Community
          </a>
          <a
            className="text-[11px] font-semibold tracking-widest text-gray-600 hover:text-blue-500 hover:underline transition-colors"
            href="https://github.com/metacall/faas"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
