import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { getAuthCookie } from '@/lib/auth';
import { sanitizeText } from '@/lib/sanitize';

// Función para validar que no haya links en el mensaje
function hasLinks(text: string): boolean {
  // Regex para detectar URLs (http, https, www, o dominios comunes)
  const urlRegex = /(https?:\/\/|www\.|[\w-]+\.(com|org|net|io|co|edu|gov|mil|int|ar|es|mx|br|cl|pe|uy|py|bo|ec|ve|cr|pa|do|gt|hn|ni|sv|cu|pr|jm|tt|bb|gd|lc|vc|ag|dm|kn|bs|bz|gy|sr|gf|fk|ai|vg|ms|tc|ky|bm|fk|gs|sh|pn|io|ac|cc|tv|ws|tk|ml|ga|cf|cd|cm|cg|ci|bj|bf|td|ne|mr|sn|gm|gw|gn|sl|lr|tg|gh|ng|st|gq|ga|ao|zm|zw|mw|mz|mg|mu|sc|km|yt|re|bi|rw|ug|ke|tz|et|so|dj|er|sd|ss|ly|tn|dz|ma|eh|es|pt|ad|mc|sm|va|it|mt|gr|al|me|ba|rs|mk|bg|ro|md|ua|by|lt|lv|ee|fi|se|no|dk|is|ie|gb|nl|be|lu|ch|li|at|cz|sk|hu|si|hr|pl|de|fr|ru|tr|ge|am|az|kz|uz|tm|kg|tj|af|pk|in|bd|lk|mv|np|bt|mm|th|la|kh|vn|ph|my|sg|bn|id|tl|au|nz|pg|sb|vu|nc|pf|ws|to|fj|ki|nr|pw|fm|mh|as|gu|mp|vi|pr|do|ht|jm|tt|bb|gd|lc|vc|ag|dm|kn|bs|bz|gy|sr|gf|fk|ai|vg|ms|tc|ky|bm|fk|gs|sh|pn|io|ac|cc|tv|ws|tk|ml|ga|cf|cd|cm|cg|ci|bj|bf|td|ne|mr|sn|gm|gw|gn|sl|lr|tg|gh|ng|st|gq|ga|ao|zm|zw|mw|mz|mg|mu|sc|km|yt|re|bi|rw|ug|ke|tz|et|so|dj|er|sd|ss|ly|tn|dz|ma|eh|es|pt|ad|mc|sm|va|it|mt|gr|al|me|ba|rs|mk|bg|ro|md|ua|by|lt|lv|ee|fi|se|no|dk|is|ie|gb|nl|be|lu|ch|li|at|cz|sk|hu|si|hr|pl|de|fr|ru|tr|ge|am|az|kz|uz|tm|kg|tj|af|pk|in|bd|lk|mv|np|bt|mm|th|la|kh|vn|ph|my|sg|bn|id|tl|au|nz|pg|sb|vu|nc|pf|ws|to|fj|ki|nr|pw|fm|mh|as|gu|mp|vi))/i;
  return urlRegex.test(text);
}

// Función para contar palabras
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ transferId: string }> }
) {
  try {
    const userId = await getAuthCookie();
    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const { transferId } = await params;

    // Validar transferId
    if (!transferId || typeof transferId !== 'string' || transferId.trim() === '') {
      return NextResponse.json(
        { error: 'transferId inválido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'El mensaje es requerido' },
        { status: 400 }
      );
    }

    const trimmedMessage = message.trim();

    // Validar max 100 palabras
    const wordCount = countWords(trimmedMessage);
    if (wordCount > 100) {
      return NextResponse.json(
        { error: 'El mensaje no puede tener más de 100 palabras' },
        { status: 400 }
      );
    }

    // Validar sin links
    if (hasLinks(trimmedMessage)) {
      return NextResponse.json(
        { error: 'El mensaje no puede contener links' },
        { status: 400 }
      );
    }

    // Sanitizar mensaje (texto simple, sin HTML)
    const sanitizedMessage = sanitizeText(trimmedMessage);

    // Obtener transferencia y verificar que sea genérica y que el usuario sea el ENVIADOR
    const transfers = await executeQuery(
      `SELECT t.*, 
        w_from.user_id as from_user_id,
        w_to.user_id as to_user_id
      FROM transfers t
      JOIN wallets w_from ON LOWER(t.from_address) = LOWER(w_from.address)
      JOIN wallets w_to ON LOWER(t.to_address) = LOWER(w_to.address)
      WHERE t.id = $1`,
      [transferId]
    );

    if (transfers.length === 0) {
      return NextResponse.json(
        { error: 'Transferencia no encontrada' },
        { status: 404 }
      );
    }

    const transfer = transfers[0];

    // Verificar que sea transferencia genérica
    if (transfer.transfer_type !== 'generic') {
      return NextResponse.json(
        { error: 'Solo las transferencias genéricas pueden tener mensaje' },
        { status: 400 }
      );
    }

    // Verificar que el usuario sea el ENVIADOR (solo el enviador puede agregar mensaje)
    if (transfer.from_user_id !== userId) {
      return NextResponse.json(
        { error: 'Solo el enviador puede agregar mensaje' },
        { status: 403 }
      );
    }

    // Verificar si ya existe mensaje para determinar si es creación o edición
    const hasExistingMessage = transfer.message !== null && transfer.message !== '';
    
    // Actualizar mensaje con fechas
    if (hasExistingMessage) {
      // Es una edición: actualizar message_updated_at
      await executeQuery(
        `UPDATE transfers 
         SET message = $1, message_updated_at = now(), updated_at = now()
         WHERE id = $2`,
        [sanitizedMessage, transferId]
      );
    } else {
      // Es una creación: solo establecer message_created_at
      await executeQuery(
        `UPDATE transfers 
         SET message = $1, message_created_at = now(), updated_at = now()
         WHERE id = $2`,
        [sanitizedMessage, transferId]
      );
    }

    // Obtener transferencia actualizada
    const updatedTransfers = await executeQuery(
      `SELECT t.*, 
        u_from.username as from_username, 
        u_from.profile_image_url as from_image,
        u_to.username as to_username, 
        u_to.profile_image_url as to_image,
        w_from.user_id as from_user_id,
        w_to.user_id as to_user_id
      FROM transfers t
      JOIN wallets w_from ON LOWER(t.from_address) = LOWER(w_from.address)
      JOIN wallets w_to ON LOWER(t.to_address) = LOWER(w_to.address)
      JOIN users u_from ON w_from.user_id = u_from.id
      JOIN users u_to ON w_to.user_id = u_to.id
      WHERE t.id = $1`,
      [transferId]
    );

    if (updatedTransfers.length === 0) {
      return NextResponse.json(
        { error: 'Error al obtener transferencia actualizada' },
        { status: 500 }
      );
    }

    const updated = updatedTransfers[0];

    return NextResponse.json({
      id: updated.id,
      hash: updated.hash,
      from: updated.from_address,
      to: updated.to_address,
      value: parseFloat(updated.value),
      token: updated.token || 'USDC',
      chain: updated.chain || 'Ethereum Mainnet',
      chainId: updated.chain_id || 1,
      contractAddress: updated.contract_address,
      created_at: updated.created_at ? new Date(updated.created_at).toISOString() : undefined,
      is_public: updated.is_public,
      approved_by_sender: updated.approved_by_sender,
      approved_by_receiver: updated.approved_by_receiver,
      editing_permission_user_id: updated.editing_permission_user_id,
      transfer_type: updated.transfer_type,
      message: updated.message || null,
      message_created_at: updated.message_created_at ? new Date(updated.message_created_at).toISOString() : null,
      message_updated_at: updated.message_updated_at ? new Date(updated.message_updated_at).toISOString() : null,
      image_url: updated.image_url,
      category: updated.category,
      location: updated.location,
      description: updated.description,
      fromUser: {
        username: updated.from_username,
        profileImageUrl: updated.from_image,
        userId: updated.from_user_id,
      },
      toUser: {
        username: updated.to_username,
        profileImageUrl: updated.to_image,
        userId: updated.to_user_id,
      },
      isSender: updated.from_user_id === userId,
      isReceiver: updated.to_user_id === userId,
    });
  } catch (error: any) {
    console.error('[transfers/message] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ transferId: string }> }
) {
  try {
    const userId = await getAuthCookie();
    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const { transferId } = await params;

    // Obtener transferencia y verificar que el usuario sea el ENVIADOR
    const transfers = await executeQuery(
      `SELECT t.*, 
        w_from.user_id as from_user_id,
        w_to.user_id as to_user_id
      FROM transfers t
      JOIN wallets w_from ON LOWER(t.from_address) = LOWER(w_from.address)
      JOIN wallets w_to ON LOWER(t.to_address) = LOWER(w_to.address)
      WHERE t.id = $1`,
      [transferId]
    );

    if (transfers.length === 0) {
      return NextResponse.json(
        { error: 'Transferencia no encontrada' },
        { status: 404 }
      );
    }

    const transfer = transfers[0];

    // Verificar que sea transferencia genérica
    if (transfer.transfer_type !== 'generic') {
      return NextResponse.json(
        { error: 'Solo las transferencias genéricas pueden tener mensaje' },
        { status: 400 }
      );
    }

    // Verificar que el usuario sea el ENVIADOR
    if (transfer.from_user_id !== userId) {
      return NextResponse.json(
        { error: 'Solo el enviador puede borrar el mensaje' },
        { status: 403 }
      );
    }

    // Borrar mensaje y sus fechas
    await executeQuery(
      `UPDATE transfers 
       SET message = NULL, message_created_at = NULL, message_updated_at = NULL, updated_at = now()
       WHERE id = $1`,
      [transferId]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[transfers/message DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}

