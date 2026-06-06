# Usamos nginx versión ligera (alpine = más pequeña)
# nginx es un servidor web que va a servir tus archivos HTML/JS
FROM nginx:alpine

# Copia TODO el contenido de tu carpeta actual
# dentro del contenedor, en la carpeta que nginx usa por defecto
COPY . /usr/share/nginx/html

# Le decimos que el contenedor escucha en el puerto 80
EXPOSE 80

# Comando que se ejecuta cuando el contenedor arranca
CMD ["nginx", "-g", "daemon off;"]