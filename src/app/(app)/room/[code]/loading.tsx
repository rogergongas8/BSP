export default function RoomLoading() {
  return (
    <div className="flex flex-col flex-1" style={{ backgroundColor: '#FF8716' }}>
      <div className="flex-1 flex items-center justify-center">
        <div className="flex gap-4">
          {[1, 2, 3].map(n => (
            <div
              key={n}
              className="w-10 h-10 rounded-full bg-white/30 animate-pulse"
              style={{ animationDelay: `${n * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
