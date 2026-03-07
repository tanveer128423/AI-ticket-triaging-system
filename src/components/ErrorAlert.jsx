export default function ErrorAlert({ message }) {
  return (
    <div
      role="alert"
      className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      {message}
    </div>
  );
}
