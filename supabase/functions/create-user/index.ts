import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Método não permitido" }),
        {
          status: 405,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Configuração do Supabase não encontrada.");
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const body = await req.json();

    const {
      name,
      username,
      email,
      password,
      role,
      storeName,
      avatar,
      active = true,
    } = body;

    if (!name || !username || !email || !password || !role) {
      return new Response(
        JSON.stringify({
          error: "Nome, username, email, password e função são obrigatórios.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name,
          username,
          role,
        },
      });

    if (authError) {
      throw new Error(`Erro ao criar autenticação: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error("Supabase não retornou o utilizador criado.");
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: authData.user.id,
        name,
        username,
        email,
        role,
        avatar_url: avatar || "",
        active,
        store_name: storeName || null,
        store_id: null,
      })
      .select()
      .single();

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);

      throw new Error(
        `Erro ao criar perfil: ${profileError.message}`
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: profile,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Erro na função create-user:", error);

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao criar utilizador.",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
});
