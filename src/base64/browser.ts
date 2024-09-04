export function base64urlencode(input: string | Uint8Array)
{
    // Step 1: Convert Uint8Array to binary string if needed
    if (input instanceof Uint8Array) {
        input = uint8ArrayToBinaryString(input)
    }
    
    // Step 2: Encode the binary string to Base64
    let base64 = btoa(input);

    // Step 3: Replace Base64 characters with Base64URL characters and remove padding
    let base64Url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    return base64Url;
}

export function base64urldecode(input: string)
{
    // Step 1: Replace Base64URL characters with standard Base64 characters
    let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
    
    // Step 2: Add padding if necessary
    const pad = base64.length % 4;
    if (pad) {
        base64 += '='.repeat(4 - pad);
    }
    
    // Step 3: Decode the Base64 string
    try {
        return atob(base64);
    } catch (e) {
        throw new Error('Invalid Base64URL string');
    }
}

export function uint8ArrayToBinaryString(input: Uint8Array)
{
    let binary = '';
    for (let i = 0; i < input.length; i++) {
        binary += String.fromCharCode(input[i]);
    }
    return binary
}