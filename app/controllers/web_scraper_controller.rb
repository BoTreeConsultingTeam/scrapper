require 'rubygems'
require 'mechanize'
require 'open-uri'
require 'pry'
require 'csv'
require 'phantomjs'
# Phantomjs.path

class WebScraperController < ApplicationController
  def new
    reset_session
    Dir.mkdir "#{File.expand_path(File.dirname(__FILE__))}/../../scrapped_data" rescue nil
  end
  def scrap

    @user_details = []
    # mechanize = Mechanize.new
    params[:user_name_list].split(',').each do |user_name|
      page = Nokogiri::HTML(open("https://twitter.com/#{user_name.try(:strip)}"))
      # page = mechanize.get('https://twitter.com/santosh4892')
      # Phantomjs.run("#{File.expand_path(File.dirname(__FILE__))}/../assets/javascripts/1.js")
      title = page.title
      about_user = page.search('p.ProfileHeaderCard-bio').text
      # @counts =  page.search('ul.ProfileNav-list li span.ProfileNav-label').children.map(&:text).zip(page.search('ul.ProfileNav-list li span.ProfileNav-value').children.map(&:text)).first(4)
      counts = page.search('ul.ProfileNav-list li span.ProfileNav-value').children.map(&:text).first(4)
      location = page.search('span.ProfileHeaderCard-locationText a').text
      profile_pic = page.search('img.ProfileAvatar-image @src').text
      if counts[2].include?('More')
        counts[2] = 0
      elsif counts[2].include?('K')
        counts[2] = counts[2].to_f * 1000
      elsif counts[2].include?('M')
        counts[2] = counts[2].to_f * 10_00_000
      end
      counts[2] = counts[2].to_i
      @user_details << [title, about_user, counts, location, profile_pic].flatten
    end
    @user_details.sort! {|a,b| a[4].to_i <=> b[4].to_i}
    session[:details] = @user_details
  end

  def scraped_data
    respond_to do |format|
      format.csv { send_data csv_data_for_home_page  }
    end
  end

  def scrap_followers
    session[:user_name_list] = params[:user_name_list]
    params[:user_name_list].split(',').each do |user|
      Thread.new { fetch_followers_of_users_and_scrap(user.strip) }
    end
    # thread.map(&:join)
  end
  
  def assign_email
    session[:email] = params[:email]
  end

  def send_list_of_followers
    number_of_users = session[:user_name_list].split(',').count
    number_of_files = Dir["#{File.expand_path(File.dirname(__FILE__))}/../../scrapped_data/*.csv"].count
    if number_of_files == number_of_users
      Thread.new { create_zip_file_and_send_email }
      session[:message] = 'Mail is sent'
    end
  end

  private
  def csv_data_for_home_page
    CSV.generate do |csv|
      csv << ['Name', 'Description', 'Tweets', 'Following', 'Followers', 'Likes', 'Location', 'Profile Pic URL']
      session[:details].each do |item|
        csv << item
      end
    end
  end

  def csv_data_for_followers
    CSV.generate do |csv|
      csv << ['']
      session[:details].each do |item|
        csv << item
      end
    end
  end

  def fetch_followers_of_users_and_scrap(user)
    Rails.logger.debug "Starting for #{user}"

    Phantomjs.run("#{File.expand_path(File.dirname(__FILE__))}/../../app/assets/javascripts/twitter_fetcher.js", user.try(:strip), ENV['ttr_user_name'], ENV['ttr_passwd'])
    folowers_file = File.read("#{File.expand_path(File.dirname(__FILE__))}/../../#{user}_followers.html")
    folowing_file = File.read("#{File.expand_path(File.dirname(__FILE__))}/../../#{user}_following.html")
    folowers_page = Nokogiri::HTML(folowers_file)
    folowing_page = Nokogiri::HTML(folowing_file)
    folowers_fullname = folowers_page.search('.fullname').map(&:text)
    folowers_username = folowers_page.search('.username').map(&:text)

    folowing_fullname = folowing_page.search('.fullname').map(&:text)
    folowing_username = folowing_page.search('.username').map(&:text)

    followers = folowers_fullname.zip(folowers_username)
    following = folowing_fullname.zip(folowing_username)
    list = followers.zip(following)

    CSV.open("#{File.expand_path(File.dirname(__FILE__))}/../../scrapped_data/#{user}_followers.csv", 'a+') do |csv|
      csv << ['Follower full name', 'Follower user name', 'Following full name', 'Following user name']
      list.each do |data|
        csv << data.flatten.insert(2, "")
      end   
    end
    Rails.logger.debug "Stop for #{user}"
  end

  def create_zip_file_and_send_email
    Rails.logger.debug '=====> Start Compressing'
    sleep 20
    input_dir = "#{File.expand_path(File.dirname(__FILE__))}/../../scrapped_data"
    output_file = "#{File.expand_path(File.dirname(__FILE__))}/../../scrapped_data/scrapped_data.zip"
    ZipFileGenerator.new(input_dir, output_file).write
    Rails.logger.debug '=====> Compressed'
    ScrappedDataMailer.data_mailer.deliver
    Dir["#{File.expand_path(File.dirname(__FILE__))}/../../scrapped_data/*"].each {|file| File.delete("#{file}") }
    Dir["#{File.expand_path(File.dirname(__FILE__))}/../../*.html"].each {|file| File.delete("#{file}") }
  end
end
