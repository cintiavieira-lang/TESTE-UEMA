
-- Seed Products using Category IDs
DO $$ 
DECLARE 
    traditional_id UUID;
    acai_id UUID;
    cupuacu_id UUID;
BEGIN
    -- Get IDs for categories
    SELECT id INTO traditional_id FROM categories WHERE name = 'Tradicional' LIMIT 1;
    SELECT id INTO acai_id FROM categories WHERE name = 'Açaí' LIMIT 1;
    SELECT id INTO cupuacu_id FROM categories WHERE name = 'Cupuaçu' LIMIT 1;

    -- Insert Products
    INSERT INTO products (name, description, price, image, category_id, tags) VALUES 
    (
        'Açaí Power', 
        'Açaí cremoso, xarope de guaraná e granola', 
        14.50, 
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBD3k692D5YxyD-SYSh14yHGr-EQcjU6JzSiGuQay7GxhY6IqxRL87RhBOWmBfnEousB82Kl90EvK5qiOEa7Td3Z8w2sxqShczz-CkgWPXJFK8KDjihPja2MRoVpQGhkIiS7ntWPdkddtU1mjPR8SflhJDDQmDoQWAvun6QvRl6VUXZDMT3kRsKC_8ITEL5NYha3xZDJkskPSlZR57WzX8ZyXfEASihLkpTF9TeVYAxYO5ZV6LbsTgLJYzMs4-ycaGcSUALBWg1KLo6', 
        acai_id, 
        ARRAY['Novo Verão']
    ),
    (
        'Cupuaçu Gelado', 
        'Polpa exótica de cupuaçu misturada com guaraná gelado', 
        13.00, 
        'https://lh3.googleusercontent.com/aida-public/AB6AXuARu177Ivu1verw4SmXj9R0RByHgCi7NH0YEUQfY_Ccizn01prYoOeYyd-0kBv1CEOhG0ZCHRRLW5fw3hHnsoVIZrejhU12GANvApS3r-ERppfg-TYFFn0l80vADGdPJtV79IPQ9w1PBYvq9UZKFtYuxMGv2ib-7HwaGmuwF35Wh3wQP0CdHKapbN_b1qMO3qthYL33d6wbdqZm2jucU9NnFCJf-4Enmr99GP3fkcfPVFTODvv0zk4BEQHTtCEA4ek7Nx5PSfrRtm9e', 
        cupuacu_id, 
        NULL
    ),
    (
        'Guaraná Tradicional com Amendoim', 
        'Experimente a verdadeira força da Amazônia! Nosso Guaraná Tradicional é batido com xarope natural e amendoim selecionado, criando uma textura cremosa e um sabor inigualável.', 
        18.90, 
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDoaf8EX31SGkK14t12cRNu1BTbEmZcEtdGq2hMuHRw_yv9W6wOjSzEx7PeINNZ_7J3F88cntYtkgIgPabuRdisKmlnqqpo18m9zLou52H_FgNg6HmlBMYhiLgFEsFEyQiJ0JwvMHxvEb6tZo_o7bjfVTkzlOriG2w5zdf5nfXxXxPZh64S5ByNNwjGMKh9-K-JD7QU0TvT5fVUBaobepbHG5mPoFW6jPyrECfzx8ZlBYY_u9N8tqkn_aOUqJd1yzXVShyxWc9RzdU9', 
        traditional_id, 
        NULL
    ),
    (
        'Guaraná com Cupuaçu Cremoso', 
        'O sabor exótico da Amazônia em sua melhor forma! Nosso tradicional guaraná batido com polpa fresca de cupuaçu, resultando em uma bebida super cremosa.', 
        21.90, 
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCtc4ry44CXUVgCA02j53rHontqg9CkBwrPti2nRqOAe71R52X1l9ejlLa7Kuk2DHPESsBBMxPwiF32GBK-fLgxoQ7V45-xS46YfALzTOfvooPBPxInKSmKh24V-OLUE3zV5FICxrit1IdlbvVt4wIW3cKYF5AOeJ0owXSKtWqkYaaZoHkJSIWermyok0de_7XQ-2xoaRXuvR9jET9ubK5UTUduQHg1oKLiyW8iN1XnoXDr7awMBm4jstDyDUmD1oahrK2BfQ59nZME', 
        cupuacu_id, 
        NULL
    );
END $$;
