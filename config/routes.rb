Rails.application.routes.draw do
  get 'scrapper/index'

  # root 'web_scraper#new'
  root 'web_scraper#authentication', via: [:get, :post]

  get 'web_scraper/new'

  post '/scrap_profile', to: 'web_scraper#scrap'
  post '/scrap_from_twitter', to: 'web_scraper#scrap_from_twitter'
  post '/scrap_from_fb', to: 'web_scraper#scrap_from_fb'
  post '/scrap_db_fan_page', to: 'web_scraper#scrap_db_fan_page'
  get '/waiting', to: 'web_scraper#waiting'
  get '/scrapped_file', to: 'web_scraper#scrapped_file'
  post '/scrap_youtube', to: 'web_scraper#youtube_scraper'
  post '/scrap_instagram', to: 'web_scraper#instagram_scraper'
  post '/scrap_pinterest', to: 'web_scraper#pinterest_scraper'
  post '/scrap_twitter', to: 'web_scraper#twitter_scraper'
   post '/scrap_vine', to: 'web_scraper#vine_scraper'
  # get '/fb_scrapped_data', to: 'web_scraper#fb_scrapped_data'
  get 'scrapper/view'

  get 'scraped_data', to: 'web_scraper#scraped_data'
  get '/assign_email', to: 'web_scraper#assign_email'

  get 'send_list_of_followers', to: 'web_scraper#send_list_of_followers'
  # The priority is based upon order of creation: first created -> highest priority.
  # See how all your routes lay out with "rake routes".

  # You can have the root of your site routed with "root"
  # root 'welcome#index'

  # Example of regular route:
  #   get 'products/:id' => 'catalog#view'

  # Example of named route that can be invoked with purchase_url(id: product.id)
  #   get 'products/:id/purchase' => 'catalog#purchase', as: :purchase

  # Example resource route (maps HTTP verbs to controller actions automatically):
  #   resources :products

  # Example resource route with options:
  #   resources :products do
  #     member do
  #       get 'short'
  #       post 'toggle'
  #     end
  #
  #     collection do
  #       get 'sold'
  #     end
  #   end

  # Example resource route with sub-resources:
  #   resources :products do
  #     resources :comments, :sales
  #     resource :seller
  #   end

  # Example resource route with more complex sub-resources:
  #   resources :products do
  #     resources :comments
  #     resources :sales do
  #       get 'recent', on: :collection
  #     end
  #   end

  # Example resource route with concerns:
  #   concern :toggleable do
  #     post 'toggle'
  #   end
  #   resources :posts, concerns: :toggleable
  #   resources :photos, concerns: :toggleable

  # Example resource route within a namespace:
  #   namespace :admin do
  #     # Directs /admin/products/* to Admin::ProductsController
  #     # (app/controllers/admin/products_controller.rb)
  #     resources :products
  #   end
end
