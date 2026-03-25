export function Footer() {
  return (
    <footer className="bg-charcoal px-4 py-12 text-cream-50 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1200px]">
        <p className="font-body text-sm text-cream-50/60">
          &copy; {new Date().getFullYear()} St. Basil&apos;s Syriac Orthodox Church.
          All rights reserved.
        </p>
      </div>
    </footer>
  )
}
