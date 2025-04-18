import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import { Resend } from 'npm:resend';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Log environment variables availability (not their values)
    console.log('Environment check:', {
      hasResendKey: Boolean(Deno.env.get('RESEND_API_KEY')),
      hasSupabaseUrl: Boolean(Deno.env.get('SUPABASE_URL')),
      hasSupabaseKey: Boolean(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))
    });

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY não configurada');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Credenciais do Supabase não configuradas');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const resend = new Resend(resendApiKey);

    const { invitation_id } = await req.json();
    if (!invitation_id) {
      throw new Error('ID do convite não fornecido');
    }

    console.log('Buscando convite:', invitation_id);

    // Get invitation details
    const { data: invitation, error: invitationError } = await supabase
      .from('musician_invitations')
      .select('*')
      .eq('id', invitation_id)
      .is('deleted_at', null)
      .single();

    if (invitationError) {
      console.error('Erro ao buscar convite:', invitationError);
      throw new Error(`Erro ao buscar convite: ${invitationError.message}`);
    }

    if (!invitation) {
      throw new Error('Convite não encontrado');
    }

    console.log('Convite encontrado:', {
      id: invitation.id,
      email: invitation.email,
      status: invitation.status
    });

    // Create accept invitation URL
    const acceptUrl = `${req.headers.get('origin')}/accept-invite?token=${invitation.token}`;

    console.log('Enviando email para:', invitation.email);

    // Send email using Resend
    try {
      const { data: emailData, error: emailError } = await resend.emails.send({
        from: 'Agenda Musical <onboarding@resend.dev>',
        to: invitation.email,
        subject: 'Convite para Agenda Musical',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #4F46E5;">Bem-vindo à Agenda Musical!</h1>
            <p>Você foi convidado para fazer parte da nossa plataforma.</p>
            <p>Para aceitar o convite e criar sua conta, clique no botão abaixo:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${acceptUrl}" 
                 style="background-color: #4F46E5; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 6px; display: inline-block;">
                Aceitar Convite
              </a>
            </div>
            <p style="color: #666;">
              Este convite expira em 7 dias. Se você não solicitou este convite, 
              por favor ignore este email.
            </p>
          </div>
        `,
      });

      if (emailError) {
        console.error('Erro ao enviar email:', emailError);
        throw emailError;
      }

      console.log('Email enviado com sucesso');

      return new Response(
        JSON.stringify({ 
          message: 'Email enviado com sucesso',
          invitation: invitation
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } catch (emailError) {
      console.error('Erro ao enviar email:', emailError);
      throw new Error(`Falha ao enviar email: ${emailError.message}`);
    }
  } catch (error) {
    console.error('Erro na função send-invitation:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro interno do servidor',
        details: error.stack
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});