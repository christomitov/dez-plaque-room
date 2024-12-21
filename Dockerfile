FROM nginx:alpine

# Copy the static website files into the Nginx server
COPY . /usr/share/nginx/html/

# Copy a custom nginx config if you need it
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]