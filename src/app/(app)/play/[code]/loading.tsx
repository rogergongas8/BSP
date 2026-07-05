export default function PlayLoading() {
  return (
    <div className="flex flex-col min-h-screen bg-white items-center justify-center">
      <div className="flex gap-4">
        {[1, 2, 3].map(n => (
          <div
            key={n}
            className="w-12 h-12 rounded-full bg-gray-100 animate-pulse"
            style={{ animationDelay: `${n * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  )
}
