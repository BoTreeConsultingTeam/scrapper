class ScrappedDataMailer < ApplicationMailer
  default from: "rails.app.demo@gmail.com"

  def data_mailer(email)
    mail.attachments['scrapped_data.zip'] = open("#{File.expand_path(File.dirname(__FILE__))}/../../scrapped_data.zip").read
    mail(to: email, cc: 'parth.barot@botreeconsulting.com', subject: 'Twitter Scrapped Data')
  end
end