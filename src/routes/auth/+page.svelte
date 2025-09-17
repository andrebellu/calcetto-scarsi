<script></script>

<body class="min-h-screen">
  <div class="flex min-h-screen items-center justify-center">
    <div
      class="w-full max-w-sm rounded-xl bg-slate-800 shadow-xl p-8 border border-blue-900/40"
    >
      <!-- Logo & Nome -->
      <div class="flex flex-col items-center mb-8">
        <div
          class="bg-blue-400/30 backdrop-blur-md border border-white/30 shadow-lg rounded-full p-4 flex items-center justify-center"
        >
          <span
            class="material-symbols-outlined text-5xl text-blue-500 drop-shadow"
            >sports_soccer</span
          >
        </div>
        <span
          class="mt-3 text-3xl font-extrabold text-blue-300 tracking-wide drop-shadow-lg font-sans"
        >
          Frochannel
        </span>
      </div>

      <h2 class="text-xl font-semibold text-white mb-1 text-center">
        Accedi al tuo account
      </h2>
      <form method="POST" action="?/login" class="space-y-5 mt-6">
        <div>
          <label
            class="block text-sm font-medium text-slate-300 mb-1"
            for="email"
          >
            Email
            <input
              name="email"
              type="email"
              required
              class="w-full px-4 py-2 rounded bg-slate-700 text-slate-100 border border-slate-600 focus:ring-2 focus:ring-blue-400 outline-none mt-1"
              placeholder="nome@email.com"
            />
          </label>
        </div>
        <div>
          <label
            class="block text-sm font-medium text-slate-300 mb-1"
            for="password"
          >
            Password
            <input
              name="password"
              type="password"
              required
              class="w-full px-4 py-2 rounded bg-slate-700 text-slate-100 border border-slate-600 focus:ring-2 focus:ring-blue-400 outline-none mt-1"
              placeholder="Password"
            />
          </label>
        </div>
        <div class="flex items-center justify-between text-sm">
          <label class="flex items-center gap-2 text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              class="accent-blue-500 w-4 h-4"
              name="remember"
            />
            Ricordami
          </label>
        </div>
        <div class="flex gap-2 mt-4">
          <button
            type="submit"
            class="flex-1 py-2 rounded-3xl bg-blue-500/30 backdrop-blur-md border border-white/30 text-blue-100 font-semibold shadow-lg hover:bg-blue-500 hover:text-white transition"
            >Login</button
          >
        </div>
      </form>
    </div>
  </div>
</body>
