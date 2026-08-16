import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 text-white">
      <div className="max-w-3xl text-center">
        <p className="mb-5 text-sm uppercase tracking-[0.3em] text-neutral-500">
          Music Studio
        </p>

        <h1 className="text-5xl font-semibold tracking-tight md:text-7xl">
          Suona.
          <br />
          Segui.
          <br />
          Impara.
        </h1>

        <p className="mx-auto mt-8 max-w-xl text-lg leading-8 text-neutral-400">
          Spartito, tempo e metronomo
          sincronizzati in un unico ambiente
          di studio.
        </p>

        <Link
          href="/studio"
          className="mt-10 inline-flex rounded-full bg-white px-8 py-4 font-semibold text-neutral-950"
        >
          Apri Studio
        </Link>
      </div>
    </main>
  );
}
