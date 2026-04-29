export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <h1 className="text-6xl font-bold text-gray-300">404</h1>
      <p className="mt-4 text-lg text-gray-600">Page not found</p>
      <a
        href="/"
        className="mt-6 px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Go Home
      </a>
    </div>
  )
}
