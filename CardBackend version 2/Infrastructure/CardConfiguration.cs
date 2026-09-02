using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Domain;

namespace Infrastructure;

public class CardConfiguration : IEntityTypeConfiguration<Card>
{
    public void Configure(EntityTypeBuilder<Card> builder)
    {
        builder.HasKey(p => p.Id);

        builder.Property(p => p.ImgUrl)
               .HasDefaultValue("https://scontent.fsgn5-9.fna.fbcdn.net/v/t39.30808-6/652366246_2426499074488041_3406179127494398674_n.jpg?stp=dst-jpg_tt6&cstp=mx223x226&ctp=s223x226&_nc_cat=110&_nc_map=urlgen_bucketless&ccb=1-7&_nc_sid=a5f93a&_nc_eui2=AeETLG43cUY7qs65SHYS6Vcn_wjZaxWH86H_CNlrFYfzoUSjlKf9DSDeElv5Q95qvX4TzOlv4aAZoknoU7em-c5s&_nc_ohc=1tcGX_WfIBQQ7kNvwETKtI_&_nc_oc=AdoJoZ2Pb1npvDgjnpgWCqV7h07w_7QpHyJdFJLe3P03ckQ4GG_RSmsDX7SVDSkpOwM&_nc_zt=23&_nc_ht=scontent.fsgn5-9.fna&_nc_gid=ACuIDrXNSNSSqmMcP17spQ&_nc_ss=7b2a8&oh=00_AQJ2zyFYSSH0vIqSRf1d2_vhSJpptsxtXzb5sduN88nhvw&oe=6A9DAE19");

        builder.Property(p => p.IsRare)
               .HasDefaultValue(false);

        builder.Property(p => p.Quantity)
               .HasDefaultValue(0);

        builder.Property(p => p.Remaining)
               .HasDefaultValue(0);

        builder.Property(p => p.DrawnAt)
               .HasDefaultValue(null);
    }
}